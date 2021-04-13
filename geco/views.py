from django.shortcuts import render


def context(request):
    return render(request, 'geco/context.html', {
        'field': ''
    })
