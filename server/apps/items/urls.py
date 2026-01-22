from django.urls import path
from . import views

app_name = "items"

urlpatterns = [
    path("items/", views.ItemListView.as_view(), name="item-list"),
    path("items/<uuid:pk>/", views.ItemDetailView.as_view(), name="item-detail"),
    path("items/search/", views.ItemSearchView.as_view(), name="item-search"),
    path("tags/", views.TagListView.as_view(), name="tag-list"),
    path("tags/<uuid:pk>/", views.TagDetailView.as_view(), name="tag-detail"),
    path("files/upload/", views.FileUploadView.as_view(), name="file-upload"),
    path("files/<uuid:pk>/serve/", views.FileServeView.as_view(), name="file-serve"),
]
