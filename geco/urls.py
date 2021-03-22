from django.urls import path
from . import api
from . import views

urlpatterns = [
    path('', views.context, name='context'),
    path(r'api/info/<str:query>/',
         api.info),
    path(r'api/newick/<str:query>/', api.newick),
    path(r'api/context/<str:query>/', api.context),
    path(r'api/seq/<str:query>/', api.get_sequence),
    path(r'api/taxafams/<str:query>/<str:spec>/<str:cov>/',
         api.fam_by_taxa),
    path(r'api/fnfams/<str:query_type>/<str:query>/<str:score>/',
         api.fam_by_annotation),
]
