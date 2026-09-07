from typing import Any

from app.db.supabase_client import get_supabase_client


class AvailabilityService:
    @staticmethod
    def _time_to_minutes(value: str) -> int:
        hours, minutes = map(int, value.split(":"))
        return hours * 60 + minutes

    @staticmethod
    def intervals_overlap(start_1: str, end_1: str, start_2: str, end_2: str) -> bool:
        return AvailabilityService._time_to_minutes(start_1) < AvailabilityService._time_to_minutes(end_2) and (
            AvailabilityService._time_to_minutes(end_1) > AvailabilityService._time_to_minutes(start_2)
        )

    @staticmethod
    def get_day_of_week_from_date(date_str: str) -> str:
        import datetime

        year, month, day = map(int, date_str.split("-"))
        date_obj = datetime.date(year, month, day)
        days = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]
        return days[date_obj.weekday()]

    @staticmethod
    def check_conflict(resource_id: str, date: str, start_time: str, end_time: str, exclude_booking_id: str | None = None) -> dict[str, Any]:
        db = get_supabase_client()

        if AvailabilityService._time_to_minutes(end_time) <= AvailabilityService._time_to_minutes(start_time):
            return {"hasConflict": True, "reason": "End time must be after the start time."}

        resource = db.table("resources").select("id, name, status").eq("id", resource_id).maybe_single().execute()
        resource_data = resource.data
        if not resource_data:
            return {"hasConflict": True, "reason": "Requested resource does not exist.", "conflictType": "RESOURCE_STATUS"}

        status = resource_data.get("status")
        if status == "UNAVAILABLE":
            return {"hasConflict": True, "reason": "Resource is currently marked as Unavailable by the administrator.", "conflictType": "RESOURCE_STATUS"}
        if status == "MAINTENANCE":
            return {"hasConflict": True, "reason": "Resource is currently under active Maintenance.", "conflictType": "MAINTENANCE"}

        maintenance = (
            db.table("maintenance_schedules")
            .select("title, start_time, end_time, reason")
            .eq("resource_id", resource_id)
            .lte("start_date", date)
            .gte("end_date", date)
            .execute()
        )

        for item in maintenance.data or []:
            if AvailabilityService.intervals_overlap(start_time, end_time, item["start_time"], item["end_time"]):
                return {
                    "hasConflict": True,
                    "reason": f'Scheduled Maintenance Block: "{item["title"]}"',
                    "conflictType": "MAINTENANCE",
                    "details": item.get("reason") or "Ongoing facility maintenance",
                }

        timetable = (
            db.table("timetable_entries")
            .select("subject, class_section, faculty, start_time, end_time")
            .eq("resource_id", resource_id)
            .eq("day_of_week", AvailabilityService.get_day_of_week_from_date(date))
            .execute()
        )

        for item in timetable.data or []:
            if AvailabilityService.intervals_overlap(start_time, end_time, item["start_time"], item["end_time"]):
                return {
                    "hasConflict": True,
                    "reason": f"College Timetable Occupation: {item['subject']} ({item['class_section']})",
                    "conflictType": "TIMETABLE",
                    "details": f"Faculty: {item['faculty']} | Regular Schedule {item['start_time']} - {item['end_time']}",
                }

        query = (
            db.table("bookings")
            .select("id, user_name, user_role, purpose, start_time, end_time")
            .eq("resource_id", resource_id)
            .eq("date", date)
            .eq("status", "APPROVED")
        )
        if exclude_booking_id:
            query = query.neq("id", exclude_booking_id)

        approved = query.execute()

        for item in approved.data or []:
            if AvailabilityService.intervals_overlap(start_time, end_time, item["start_time"], item["end_time"]):
                return {
                    "hasConflict": True,
                    "reason": f'Conflicting Approved Reservation: "{item["purpose"]}"',
                    "conflictType": "APPROVED_BOOKING",
                    "details": f"Reserved by {item['user_name']} ({item['user_role']}) | Time: {item['start_time']} - {item['end_time']}",
                }

        return {"hasConflict": False}
