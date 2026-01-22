from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from typing import Any, Optional


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Optional[Response]:
    response = exception_handler(exc, context)

    if response is not None:
        custom_response_data = {
            "error": {
                "code": exc.__class__.__name__.upper(),
                "message": str(exc.detail) if hasattr(exc, "detail") else str(exc),
            }
        }
        response.data = custom_response_data

    return response
