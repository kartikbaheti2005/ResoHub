from datetime import datetime, timezone
from typing import Any

from app.core.exceptions import APIException, NotFoundError
from app.db.supabase_client import get_supabase_client
from app.services.availability_service import AvailabilityService


class BookingService:
    def __init__(self, user_id: str | None = None):
        self.db = get_supabase_client()
        self.user_id = user_id

    def _get_actor(self, user_id: str) -> dict[str, Any]:
        profile = self.db.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
        role_response = self.db.table("user_roles").select("role").eq("user_id", user_id).limit(1).execute()

        role = (role_response.data or [{}])[0].get("role", "STUDENT")

        return {
            "id": user_id,
            "name": (profile.data or {}).get("name") if profile.data else "Unknown user",
            "email": (profile.data or {}).get("email") if profile.data else "",
            "department": (profile.data or {}).get("department") if profile.data else "",
            "role": role,
        }

    def _assert_manager(self, user_id: str) -> None:
        result = self.db.rpc("has_role", {"_user_id": user_id, "_role": "MANAGER"}).execute()
        if result.data is not True:
            raise APIException("Only resource managers can perform this action.", status_code=403)

    def list_bookings(self) -> list[dict[str, Any]]:
        response = self.db.table("bookings").select("*").order("requested_at", desc=True).execute()
        return response.data or []

    def create_booking(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.user_id:
            raise APIException("Authentication required", status_code=401)

        resource = (
            self.db.table("resources")
            .select("id, name, location")
            .eq("id", payload["resource_id"])
            .maybe_single()
            .execute()
        )
        if not resource.data:
            raise NotFoundError("The requested resource was not found.")

        conflict = AvailabilityService.check_conflict(
            payload["resource_id"],
            payload["date"],
            payload["start_time"],
            payload["end_time"],
        )
        if conflict.get("hasConflict"):
            raise APIException(conflict.get("reason") or "Resource is not available for the requested time slot.", status_code=409)

        actor = self._get_actor(self.user_id)
        resource_data = resource.data

        created = (
            self.db.table("bookings")
            .insert(
                {
                    "resource_id": resource_data["id"],
                    "resource_name": resource_data["name"],
                    "resource_location": resource_data["location"],
                    "user_id": actor["id"],
                    "user_name": actor["name"],
                    "user_role": actor["role"],
                    "user_email": actor["email"],
                    "user_department": actor["department"],
                    "date": payload["date"],
                    "start_time": payload["start_time"],
                    "end_time": payload["end_time"],
                    "purpose": payload["purpose"],
                    "description": payload.get("description") or "",
                    "expected_count": payload.get("expected_count") or 1,
                    "required_equipment": payload.get("required_equipment") or [],
                    "status": "PENDING",
                }
            )
            .select("*")
            .single()
            .execute()
        )

        if not created.data:
            raise APIException("Booking was not created.", status_code=500)

        self.db.table("notifications").insert(
            {
                "user_id": actor["id"],
                "title": "Booking request submitted",
                "message": f"Your request for {resource_data['name']} on {payload['date']} ({payload['start_time']} - {payload['end_time']}) is pending manager review.",
                "type": "REQUEST_CREATED",
                "booking_id": created.data["id"],
            }
        ).execute()

        return created.data

    def review_booking(self, booking_id: str, payload: dict[str, Any], user_id: str) -> dict[str, Any]:
        self._assert_manager(user_id)

        booking = self.db.table("bookings").select("*").eq("id", booking_id).maybe_single().execute()
        if not booking.data:
            raise NotFoundError("Booking request not found.")

        booking_data = booking.data
        if booking_data["status"] != "PENDING":
            raise APIException("This request has already been reviewed.", status_code=409)

        if payload["status"] == "APPROVED":
            conflict = AvailabilityService.check_conflict(
                booking_data["resource_id"],
                booking_data["date"],
                booking_data["start_time"],
                booking_data["end_time"],
                booking_id,
            )
            if conflict.get("hasConflict"):
                raise APIException(f"Cannot approve — {conflict.get('reason')}", status_code=409)

        reviewer = self._get_actor(user_id)
        reviewed_at = datetime.now(timezone.utc).isoformat()

        updated = (
            self.db.table("bookings")
            .update(
                {
                    "status": payload["status"],
                    "rejection_reason": payload["reason"] if payload["status"] == "REJECTED" else None,
                    "reviewed_at": reviewed_at,
                    "reviewed_by": reviewer["name"],
                }
            )
            .eq("id", booking_id)
            .select("*")
            .single()
            .execute()
        )

        if not updated.data:
            raise APIException("Booking could not be reviewed.", status_code=500)

        self.db.table("notifications").insert(
            {
                "user_id": booking_data["user_id"],
                "title": "Booking request approved" if payload["status"] == "APPROVED" else "Booking request rejected",
                "message": (
                    f"Your booking for {booking_data['resource_name']} on {booking_data['date']} ({booking_data['start_time']} - {booking_data['end_time']}) was approved by {reviewer['name']}."
                    if payload["status"] == "APPROVED"
                    else f"Your booking for {booking_data['resource_name']} on {booking_data['date']} was rejected. Reason: {payload.get('reason') or 'No reason provided'}."
                ),
                "type": "APPROVAL" if payload["status"] == "APPROVED" else "REJECTION",
                "booking_id": booking_id,
            }
        ).execute()

        return updated.data

    def cancel_booking(self, booking_id: str, user_id: str) -> dict[str, Any]:
        booking = self.db.table("bookings").select("*").eq("id", booking_id).maybe_single().execute()
        if not booking.data:
            raise NotFoundError("Booking request not found.")

        booking_data = booking.data
        if booking_data["user_id"] != user_id:
            raise APIException("You can only cancel your own bookings.", status_code=403)

        if booking_data["status"] == "CANCELLED":
            return booking_data

        updated = (
            self.db.table("bookings")
            .update({"status": "CANCELLED"})
            .eq("id", booking_id)
            .select("*")
            .single()
            .execute()
        )

        if not updated.data:
            raise APIException("Booking could not be cancelled.", status_code=500)

        return updated.data
