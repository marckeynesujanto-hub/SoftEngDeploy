import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { useRouter } from 'next/navigation';

export interface RecycleProduct {
  recycle_product_id: string;
  product_name: string;
  product_price: number;
  product_stock: number;
  seller_name: string;
  seller_phone: string;
  description: string;
  category: string;
  weight_kg: number;
  location_area: string;
  is_available: boolean;
  created_at: string;
}

export const useMarketplaceLogic = () => {
  const [tab, setTab] = useState<'beli' | 'jual'>('beli');
  const [products, setProducts] = useState<RecycleProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [selectedProduct, setSelectedProduct] = useState<RecycleProduct | null>(null);
  const [orderModal, setOrderModal] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const [form, setForm] = useState({
    product_name: '', seller_name: '', seller_phone: '',
    product_price: '', weight_kg: '', product_stock: '',
    location_area: '', description: '', category: 'Kardus',
  });

  const router = useRouter();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recycles')
        .select('*')
        .eq('is_available', true)
        .order('created_at', { ascending: false });
      if (!error && data) setProducts(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = categoryFilter === 'Semua'
    ? products
    : products.filter(p => p.category === categoryFilter);

  const handleOrder = (product: RecycleProduct) => {
    setSelectedProduct(product);
    setOrderModal(true);
    setOrderSuccess(false);
  };

  const confirmOrder = async () => {
    if (!selectedProduct) return;
    setOrdering(true);
    try {
      await supabase.from('orders').insert({
        user_id: null,
        recycle_product_id: selectedProduct.recycle_product_id,
        order_date: new Date().toISOString(),
        order_price: selectedProduct.product_price,
        order_status: 'pending',
      });
      setOrderSuccess(true);
      setTimeout(() => {
        setOrderModal(false);
        router.push('/tracking/marketplaceTracking');
      }, 1500);
    } catch { alert('Gagal membuat pesanan.'); }
    setOrdering(false);
  };

  const handleSubmitJual = async () => {
    if (!form.product_name || !form.product_price || !form.seller_name) {
      alert('Isi data wajib (Nama produk, Harga, Nama penjual)!');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('recycles').insert({
        product_name: form.product_name,
        product_price: parseFloat(form.product_price),
        product_stock: parseInt(form.product_stock) || 1,
        seller_name: form.seller_name,
        seller_phone: form.seller_phone,
        description: form.description,
        category: form.category,
        weight_kg: parseFloat(form.weight_kg) || 1,
        location_area: form.location_area,
        is_available: true,
      });
      if (error) throw error;
      setSubmitSuccess(true);
      fetchProducts();
    } catch { alert('Gagal posting.'); }
    setSubmitting(false);
  };

  return {
    tab, setTab, products, loading, categoryFilter, setCategoryFilter,
    selectedProduct, setSelectedProduct, orderModal, setOrderModal,
    ordering, orderSuccess, form, setForm, submitting, submitSuccess,
    setSubmitSuccess, filteredProducts, handleOrder, confirmOrder, handleSubmitJual
  };
};
