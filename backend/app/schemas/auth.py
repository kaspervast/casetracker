from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class CurrentUserResponse(BaseModel):
    id: str
    username: str
    full_name: str
    roles: list[str]
    permissions: list[str]
