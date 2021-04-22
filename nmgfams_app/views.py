from django.shortcuts import render


def context(request):
    return render(request, 'nmgfams_app/context.html', {})
