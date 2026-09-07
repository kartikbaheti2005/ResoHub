from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.exceptions import APIException
from app.schemas.booking import BookingCancel, BookingCreate, BookingReview
from app.services.booking_service import BookingService

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("")
async def list_bookings(current_user: dict = Depends(get_current_user)):
    service = BookingService(user_id=current_user["id"])
    try:
        return service.list_bookings()
    except APIException as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_booking(payload: BookingCreate, current_user: dict = Depends(get_current_user)):
    service = BookingService(user_id=current_user["id"])
    try:
        return service.create_booking(payload.model_dump(by_alias=True))
    except APIException as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/{booking_id}/review")
async def review_booking(booking_id: str, payload: BookingReview, current_user: dict = Depends(get_current_user)):
    service = BookingService(user_id=current_user["id"])
    try:
        return service.review_booking(booking_id, payload.model_dump(by_alias=True), current_user["id"])
    except APIException as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/{booking_id}/cancel")
async def cancel_booking(booking_id: str, payload: BookingCancel, current_user: dict = Depends(get_current_user)):
    service = BookingService(user_id=current_user["id"])
    try:
        return service.cancel_booking(payload.id, current_user["id"])
    except APIException as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
