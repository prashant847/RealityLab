from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from ..services.simulations import ServiceError
from ..sims.employers import RateLimited, Unauthorized

log = logging.getLogger("realitylab")


def _body(code: str, message: str, details=None) -> dict:
    return {"error": {"code": code, "message": message, **({"details": details} if details else {})}}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ServiceError)
    async def service_error(_: Request, exc: ServiceError):
        return JSONResponse(status_code=exc.status, content=_body(exc.code, str(exc)))

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        details = [{"field": ".".join(str(p) for p in e["loc"] if p != "body"), "message": e["msg"]}
                   for e in exc.errors()]
        return JSONResponse(status_code=422, content=_body("validation_error", "Request validation failed.", details))

    @app.exception_handler(Unauthorized)
    async def unauthorized(_: Request, exc: Unauthorized):
        return JSONResponse(status_code=401, content=_body("unauthorized", str(exc)))

    @app.exception_handler(RateLimited)
    async def rate_limited(_: Request, exc: RateLimited):
        return JSONResponse(status_code=429, content=_body("rate_limited", str(exc)))

    @app.exception_handler(Exception)
    async def unexpected(_: Request, exc: Exception):
        log.exception("Unhandled error")
        return JSONResponse(status_code=500, content=_body("internal_error", "Unexpected server error."))
