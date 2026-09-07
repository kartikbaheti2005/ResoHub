class APIException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code


class NotFoundError(APIException):
    def __init__(self, message: str):
        super().__init__(message, status_code=404)


class UnauthorizedError(APIException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401)
