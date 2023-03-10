from rest_framework import viewsets, views
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.auth import authenticate
from datetime import datetime
from .serializers import *
from .filters import *
from .models import *
from .permissions import *


class Products(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_class = ProductsFilter
    queryset = Product.objects.filter(state='S')

    def get_serializer_class(self):
        if self.action == 'list':
            return GetProductSerializer
        else:
            return PutProductSerializer

    def delete(self, request):
        try:
            product = Product.objects.get(pk=request.GET.get('product', ''))
            product.state = 'D'
            product.save()
            return Response({"response" : "Deleted"}, status=200)
        except Product.DoesNotExist:
            return Response({"response" : "Object not found"}, status=404)



class Providers(viewsets.ModelViewSet):
    filterset_class = ProvidersFilter
    queryset = Provider.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly, IsProviderPermission, IsOneToOneProviderPermission]

    def get_serializer_class(self):
        if self.action == 'list':
            return GetProviderSerializer
        else: 
            return PutProviderSerializer

    def create(self, request):
        username = request.GET.get('username', '')
        user = User.objects.get(username=username).pk
        request.data.update({'user' : user})
        return super().create(request)
        


class Orders(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    filterset_class = OrdersFilter
    permission_classes = [IsAuthenticated, OrderOwnerPermission, StatusPermission]

    def UpdateCartStatus(self, shCart):
        orders = list( Order.objects.filter(shCart=shCart) )
        isProcessed = True
        isRejected = False
        for order in orders:
            if order.shCart.pk == shCart and order.state == 'P':
                isProcessed = False
                break
            elif order.state == 'R':
                isRejected = True
        if isProcessed:
            shoppingCart = ShoppingCart.objects.get(pk=shCart)
            if(isRejected):
                shoppingCart.state = 'D'
            else:
                shoppingCart.state = 'B'
            shoppingCart.save()

    def get_serializer_class(self):
        if self.action == 'list':
            return GetOrdersSerializer
        else:
            return PutOrdersSerializer

    def put(self, request):
        id = request.GET.get('order', '')
        status = request.GET.get('status', '')
        order = Order.objects.get(pk=id)
        order.state = status
        order.save()
        self.UpdateCartStatus(order.shCart.pk)
        return Response({"response" : "changed"}, status=200)



class ShoppingCartView(viewsets.ModelViewSet):
    queryset = ShoppingCart.objects.all()
    filterset_class = ShCartFilter
    permission_classes = [IsAuthenticated, ShCartOwnerPermission]

    def get_serializer_class(self):
        if self.action == 'list':
            return GetShCartSerializer
        else:
            return PutShCartSerializer

    def get_queryset(self):
        provider = self.request.GET.get('provider', '')
        if provider:
            orders = [order.shCart.pk for order in list(Order.objects.filter(product__provider=provider))]
            return ShoppingCart.objects.filter(pk__in=orders).order_by('state')
        else:
            return super().get_queryset()

    def create(self, request):
        username = request.GET.get('username', '')
        customer = User.objects.get(username=username).pk
        request.data.update({'customer' : customer})
        return super().create(request)

    def put(self, request):
        id = request.GET.get('shCart', '')
        cart = self.queryset.get(id=id)
        cart.state = 'C'
        cart.confirmedTime = datetime.now().date()
        cart.save()
        return Response({"response" : "Changed"}, status=201)


class Authorisation(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerialiser
    
    def list(self, request):
        username = request.GET.get('username', '')
        password = request.GET.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user:
            token = Token.objects.get_or_create(user=user)
            return Response({"token" : token[0].key})
        else:
            return Response({"response" : "authentication failed"}, status=403)

    def create(self, request):
        username = request.GET.get('username', '')
        password = request.GET.get('password', '')
        try:
            User.objects.get(username=username)
            return Response({"response" : "User with this creditionals is already exist"}, status=403)
        except User.DoesNotExist:
            user = User.objects.create_user(username=username, password=password)
            token = Token.objects.get_or_create(user=user)
            return Response({"token" : token[0].key}, status=201)
    
class IsAuthorized(views.APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({"response" : "OK"}, status=200)


