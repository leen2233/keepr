from django.urls import path
from . import views

app_name = "items"

urlpatterns = [
    path("items/", views.ItemListView.as_view(), name="item-list"),
    path("items/<uuid:pk>/", views.ItemDetailView.as_view(), name="item-detail"),
    path("items/<uuid:pk>/pin/", views.ItemPinToggleView.as_view(), name="item-pin-toggle"),
    path("items/<uuid:pk>/shares/", views.ListSharesView.as_view(), name="item-shares"),
    path("items/<uuid:pk>/share/", views.CreateShareView.as_view(), name="item-share-create"),
    path("shares/<uuid:pk>/", views.DeleteShareView.as_view(), name="share-delete"),
    path("items/batch-delete/", views.ItemBatchDeleteView.as_view(), name="item-batch-delete"),
    path("items/search/", views.ItemSearchView.as_view(), name="item-search"),
    path("shared/<str:identifier>/", views.ViewSharedItemView.as_view(), name="shared-item-view"),
    path("tags/", views.TagListView.as_view(), name="tag-list"),
    path("tags/<uuid:pk>/", views.TagDetailView.as_view(), name="tag-detail"),
    path("files/upload/", views.FileUploadView.as_view(), name="file-upload"),
    path("files/<uuid:pk>/serve/", views.FileServeView.as_view(), name="file-serve"),
]
