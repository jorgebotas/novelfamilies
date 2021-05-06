from django.urls import path
from . import api
from . import views

urlpatterns = [
    path('', views.context, name='context'),
    path(r'api/info/<str:query>/',
         api.info),
    path(r'api/tree/<str:query>/', api.tree),
    path(r'api/context/<str:query>/', api.context),
    path(r'api/seq/<str:query>/', api.sequence),
    path(r'api/seqs/<str:query>/', api.sequences),
    path(r'api/neigh_seqs/<str:query>/', api.neigh_sequences),
    path(r'api/hmm/<str:query>/', api.hmm),
    path(r'api/taxafams/<str:query>/<str:spec>/<str:cov>/<int:page>/',
         api.fam_by_taxa),
    path(r'api/fnfams/<str:query_type>/<str:query>/<int:min_rel_dist>/<str:score>/<int:page>/',
         api.fam_by_annotation),
    path(r'api/examples/<str:example_type>/info/<int:page>/',
         api.example_info),
    path(r'api/examples/<str:example_type>/<str:query>/<int:page>/',
         api.fam_by_example),
]
