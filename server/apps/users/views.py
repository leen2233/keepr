import uuid
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import login, logout
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User, EmailVerificationToken


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request: Request) -> Response:
        # Check if signup is allowed
        if not getattr(settings, "ALLOW_SIGNUP", True):
            return Response(
                {"error": {"code": "SIGNUP_DISABLED", "message": "This is a private server. Registration is disabled."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        email = request.data.get("email", "").strip().lower()
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")

        if not email or not username or not password:
            return Response(
                {"error": {"code": "MISSING_FIELDS", "message": "Email, username, and password are required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"error": {"code": "EMAIL_EXISTS", "message": "A user with this email already exists"}},
                status=status.HTTP_409_CONFLICT,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": {"code": "USERNAME_EXISTS", "message": "A user with this username already exists"}},
                status=status.HTTP_409_CONFLICT,
            )

        user = User.objects.create_user(email=email, username=username, password=password)

        token = uuid.uuid4().hex
        expires_at = timezone.now() + timedelta(hours=24)
        EmailVerificationToken.objects.create(user=user, token=token, expires_at=expires_at)
        verify_url = f"{settings.FRONTEND_URL}/verify/{token}/"

        send_mail(
            subject="Verify your email for Keepr",
            message=f"Click the link below to verify your email:\n\n{verify_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        return Response(
            {"data": {"message": "Registration successful. Please check your email to verify your account."}},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request: Request) -> Response:
        identifier = request.data.get("email_or_username", "").strip()
        password = request.data.get("password", "")

        if not identifier or not password:
            return Response(
                {"error": {"code": "MISSING_FIELDS", "message": "Email/username and password are required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=identifier).first() or User.objects.filter(username=identifier).first()

        if not user or not user.check_password(password):
            return Response(
                {"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email/username or password"}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        login(request, user)

        return Response(
            {
                "data": {
                    "user": {
                        "id": str(user.id),
                        "username": user.username,
                        "email": user.email,
                        "email_verified": user.email_verified,
                        "is_staff": user.is_staff,
                        "is_superuser": user.is_superuser,
                    }
                }
            }
        )


class LogoutView(APIView):
    def post(self, request: Request) -> Response:
        logout(request)
        return Response({"data": {"message": "Logged out successfully"}})


class MeView(APIView):
    def get(self, request: Request) -> Response:
        return Response(
            {
                "data": {
                    "user": {
                        "id": str(request.user.id),
                        "username": request.user.username,
                        "email": request.user.email,
                        "email_verified": request.user.email_verified,
                        "is_staff": request.user.is_staff,
                        "is_superuser": request.user.is_superuser,
                    }
                }
            }
        )


class VerifyEmailView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request: Request, token: str) -> Response:
        try:
            verification_token = EmailVerificationToken.objects.select_related("user").get(token=token)
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {"error": {"code": "INVALID_TOKEN", "message": "Invalid verification token"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not verification_token.is_valid():
            verification_token.delete()
            return Response(
                {"error": {"code": "EXPIRED_TOKEN", "message": "Verification token has expired"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = verification_token.user
        if user.email_verified:
            return Response(
                {"data": {"message": "Email already verified"}}
            )

        user.email_verified = True
        user.save()

        verification_token.delete()

        return Response(
            {"data": {"message": "Email verified successfully"}}
        )


class ChangePasswordView(APIView):
    def post(self, request: Request) -> Response:
        from django.contrib.auth import update_session_auth_hash

        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")

        if not current_password or not new_password:
            return Response(
                {"error": {"code": "MISSING_FIELDS", "message": "Current password and new password are required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"error": {"code": "PASSWORD_TOO_SHORT", "message": "New password must be at least 8 characters"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify current password
        if not request.user.check_password(current_password):
            return Response(
                {"error": {"code": "INVALID_PASSWORD", "message": "Current password is incorrect"}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Change password
        request.user.set_password(new_password)
        request.user.save()

        # Update session to keep user logged in
        update_session_auth_hash(request, request.user)

        return Response(
            {"data": {"message": "Password changed successfully"}}
        )
