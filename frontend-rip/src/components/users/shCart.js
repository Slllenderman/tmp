import { CartProductsCardsList, ShCartViewList } from '../cardlists/listblocks'
import { setDate, setLocation, logoutShCart, setReqReload } from '../../redux/shCartSlice'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useCookies } from 'react-cookie'
import qs from 'qs'
import axios from 'axios'

export function ShoppingCart(){
    const cart = useSelector((state) => state.cart)
    const auth = useSelector((state) => state.user.isAuthorized)
    const dispatch = useDispatch()
    const navigation = useNavigate()
    const [cookie, setCookie, removeCookie] = useCookies(['shCartDate', 'shCartLocation', 'token'])
    const [dateErr, setDateErr] = useState(false)
    const [locationErr, setLocationErr] = useState(false)
    const [emptyOrdersErr, setEmptyOrdersErr] = useState(false)
    
    useEffect(() => {
        if(!auth) navigation("/")
    }, [])
        
    const inputLocation = (e) => {
        setCookie('shCartLocation', e.target.value, {path:'/'})
        dispatch(setLocation(e.target.value))
    }

    const inputDate = (e) => {
        setCookie('shCartDate', e.target.value, {path:'/'})
        dispatch(setDate(e.target.value))
    }

    const confirmCart = () => {
        if(Object.keys(cart.orders).length != 0){
            axios.post(`/shoppingcarts/?username=${cookie.auth.login}`, {
                address : cart.location,
                date : cart.date
            }, {
                headers : {
                    Authorization : `Token ${cookie.token}`
                }
            })
            .then(response => {
                console.log(response.data.pk)
                const cartUUID = response.data.pk
                Object.keys(cart.orders).forEach(key => {
                    axios.post(`/orders/?shCart=${cartUUID}`,{
                        quantity : cart.orders[key].quantity,
                        product : cart.orders[key].product.pk,
                        shCart : cartUUID    
                    }, {
                        headers : {
                            Authorization : `Token ${cookie.token}`
                        }
                    })
                    .then(() => {
                        dispatch( logoutShCart() )
                        removeCookie('shCartDate', {path:'/'})
                        removeCookie('shCartLocation', {path:'/'})
                        removeCookie('orders', {path:'/'})
                        navigation(`/ShoppingCartView?id=${cartUUID}&provider=undefined`)  
                    })
                    .catch(err => console.log(err))
                })
            }).catch(err => {
                const data = err.response.data
                if(data.date) setDateErr(true)
                else setDateErr(false)
                if(data.address) setLocationErr(true)
                else setLocationErr(false)
                console.log(err)
            })
        } else setEmptyOrdersErr(true)
    }

    return(
        <div className="shCart-container">
            <div className="shCart-title">
                ??????????????
            </div>
            <div className="shCart-label">???????? ????????????????</div>
            { dateErr ? <div className='shCart-err'>???????????????????????? ???????????? ????????. ???????? ?????????????? ?????????? ???????????? 'YYYY-MM-DD'</div> : null }
            <input className="shCart-textBlock" type="text" defaultValue={cart.date}
            onChange={(e) => inputDate(e)}/>
            <div className="shCart-label">?????????? ????????????????</div>
            { locationErr ? <div className='shCart-err'>???????? ?????????????? ?????????????? ???????? ????????????????????</div> : null }
            <div className="shCart-grid">
                <input className="shCart-textBlock" type="text" defaultValue={cart.location}
                onChange={(e) => inputLocation(e)}/>
                <button className="shCart-confirm" onClick={() => confirmCart()}><span>??????????????</span></button>
            </div>
            <div className='shCart-title'>{`?????????? ??????????: ${cart.sum} `}</div>
            <CartProductsCardsList emptyErr={emptyOrdersErr}/>
        </div>
)}

export function ShoppingCartView(){
    const user = useSelector((state) => state.user)
    const req = useSelector((state) => state.cart.req)
    const [cookie, setCookie] = useCookies(["auth"])
    const [params, setParams] = useSearchParams()
    const dispatch = useDispatch()
    const navigation = useNavigate()  
    const [cart, setCart] = useState()
    let parametrs

    useEffect(() => {
        if(!user.isAuthorized) navigation("/")
        if(req) dispatch( setReqReload(false) )
            if(params.get('provider') != 'undefined'){
                parametrs = {
                    provider : params.get('provider'),
                    id : params.get('uuid') 
                }
            }
            else{
                parametrs = {
                    username : cookie.auth.login,
                    id : params.get('uuid') 
                }
            }
            if(cookie.token != '')
                axios.get('/shoppingcarts?' + qs.stringify(parametrs),
                { "headers" : { "Authorization" : "token " + cookie.token }})
                .then((response) => setCart(response.data[0]) )
                .catch((err) => console.log(err))
    }, [req])

    return(
        cart ? 
        <div className="shCart-container">
            <div className="shCart-title">??????????????</div>
            <div className="shCart-view-label">{`?????????????? ????????????????: ${cart.address}`}</div>
            <div className="shCart-view-label">{`???????? ????????????????: ${cart.date}`}</div>
            { cart.confirmedTime == null ? 
              <div className="shCart-view-label">{`???????? ????????????????: ${cart.creatingTime}`}</div> :
              <div className="shCart-view-label">{`???????? ????????????: ${cart.confirmedTime}`}</div> }
            { cart.state == 'A'? <div className="shCart-view-label">?????????? ????????????????????????????</div> :
              cart.state == 'B'? <div className="shCart-view-label">?????????? ?????????????? ????????????</div> :
              cart.state == 'C'? <div className="shCart-view-label">?????????? ????????????</div> :
              cart.state == 'D'? <div className="shCart-view-label">?????????? ????????????????</div> : null }
            <ShCartViewList token={cookie.token} uuid={params.get('uuid')} cart={cart}/>
        </div> : null
)}
