from fastapi import APIRouter

from app.api.v1.endpoints.bookings import router as bookings_router

router = APIRouter(prefix="/api/v1")
router.include_router(bookings_router)
