import { get, post, del, put } from '@/utils/request'

export function getProductList() {
  return get('/products')
}

export function addProduct(data) {
  return post('/products', data)
}

export function updateProduct(id, data) {
  return put(`/products/${id}`, data)
}

export function deleteProduct(id) {
  return del(`/products/${id}`)
}
