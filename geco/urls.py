from django.urls import path
from . import views

urlpatterns = [
    path('', views.context, name='context')
    path(r'api/newick/<str:query>/', api.newick),
    path(r'api/context/<str:query>/<int:cutoff>/', api.context),

]

