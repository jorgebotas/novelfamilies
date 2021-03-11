from django.urls import path
from . import api
from . import views

urlpatterns = [
    path('', views.context, name='context'),
    path(r'api/info/<str:search_type>/<str:query>/',
         api.info),
    path(r'api/newick/<str:query>/', api.newick),
    path(r'api/context/<str:query>/', api.context),
    path(r'api/taxafams/<str:query>/<int:spec>/<int:cov>/',
         api.fam_by_taxa),
]

