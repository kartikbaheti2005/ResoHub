from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


BookingStatus = Literal["PENDING", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"]


class BookingCreate(BaseModel):
    resource_id: str = Field(..., alias="resourceId")
    date: str
    start_time: str = Field(..., alias="startTime")
    end_time: str = Field(..., alias="endTime")
    purpose: str
    description: str | None = None
    expected_count: int | None = Field(default=1, alias="expectedCount")
    required_equipment: list[str] | None = Field(default_factory=list, alias="requiredEquipment")

    model_config = {"populate_by_name": True}


class BookingReview(BaseModel):
    status: Literal["APPROVED", "REJECTED"]
    reason: str | None = None


class BookingOut(BaseModel):
    id: str
    resource_id: str = Field(..., alias="resourceId")
    resource_name: str = Field(..., alias="resourceName")
    resource_location: str = Field(..., alias="resourceLocation")
    user_id: str = Field(..., alias="userId")
    user_name: str = Field(..., alias="userName")
    user_role: str = Field(..., alias="userRole")
    user_email: str = Field(..., alias="userEmail")
    user_department: str = Field(..., alias="userDepartment")
    date: str
    start_time: str = Field(..., alias="startTime")
    end_time: str = Field(..., alias="endTime")
    purpose: str
    description: str = ""
    expected_count: int = Field(..., alias="expectedCount")
    required_equipment: list[str] = Field(default_factory=list, alias="requiredEquipment")
    status: BookingStatus
    rejection_reason: str | None = Field(default=None, alias="rejectionReason")
    requested_at: datetime = Field(..., alias="requestedAt")
    reviewed_at: datetime | None = Field(default=None, alias="reviewedAt")
    reviewed_by: str | None = Field(default=None, alias="reviewedBy")

    model_config = {"populate_by_name": True, "from_attributes": True}


class BookingCancel(BaseModel):
    id: str
