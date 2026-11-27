import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ShoppingCart,
  Search,
  Menu,
  Plus,
  Minus,
  Trash2,
  X,
  Package,
  ShoppingBag,
  Store,
  ArrowRight,
  LoaderCircle,
  Pencil,
  ClipboardList
} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:5000/api/products";
const ORDER_API_URL = "http://localhost:5000/api/orders";

const categories = [
  "All Products",
  "Electronics",
  "Fashion",
  "Home & Living",
  "Accessories"
];

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Products");
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Electronics",
    stock: "",
    image: ""
  });

  // Load products from MongoDB through Express
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      setProducts(response.data);
      setError("");
    } catch (err) {
      setError("Unable to connect to ShopEase. Please check your backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Search and category filtering
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        category === "All Products" ||
        product.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  // Add product to shopping cart
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert("This product is out of stock.");
      return;
    }

    setCart((previous) => {
      const existing = previous.find(
        (item) => item._id === product._id
      );

      if (existing) {
        if (existing.quantity >= product.stock) {
          alert("You have reached the available stock limit.");
          return previous;
        }

        return previous.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...previous, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, amount) => {
    setCart((previous) =>
      previous
        .map((item) =>
          item._id === id
            ? {
                ...item,
                quantity: Math.min(
                  item.stock,
                  item.quantity + amount
                )
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Open the form to create a new product
  const openAddForm = () => {
    setEditingProduct(null);
    setForm({
      name: "",
      description: "",
      price: "",
      category: "Electronics",
      stock: "",
      image: ""
    });
    setFormOpen(true);
  };

  // Open the form with the selected product's details
  const openEditForm = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      category: product.category || "Electronics",
      stock: String(product.stock ?? ""),
      image: product.image || ""
    });
    setFormOpen(true);
  };

  // Create or update a product in MongoDB
  const handleSaveProduct = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);

      const productData = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock)
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/${editingProduct._id}`, productData);
      } else {
        await axios.post(API_URL, productData);
      }

      setFormOpen(false);
      setEditingProduct(null);
      await fetchProducts();
      alert(editingProduct ? "Product updated successfully!" : "Product added successfully!");
    } catch (err) {
      alert(
        err.response?.data?.message ||
        `Unable to ${editingProduct ? "update" : "add"} product. Please try again.`
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete a product from MongoDB
  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/${product._id}`);
      setCart((previous) => previous.filter((item) => item._id !== product._id));
      await fetchProducts();
      alert("Product deleted successfully!");
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Unable to delete product. Please try again."
      );
    }
  };

  // Place an order using the backend. The server verifies prices and stock.
  const handlePlaceOrder = async (event) => {
    event.preventDefault();

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    try {
      setPlacingOrder(true);

      const response = await axios.post(ORDER_API_URL, {
        customer,
        items: cart.map((item) => ({
          productId: item._id,
          quantity: item.quantity
        }))
      });

      setOrderSuccess(response.data.order);
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setCustomer({ name: "", email: "", phone: "", address: "" });
      await fetchProducts();
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Unable to place your order. Please check your details and try again."
      );
      await fetchProducts();
    } finally {
      setPlacingOrder(false);
    }
  };

  // Load all orders for the ShopEase order-management view.
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      setOrdersError("");
      const response = await axios.get(ORDER_API_URL);
      setOrders(response.data);
    } catch (err) {
      setOrdersError(
        err.response?.data?.message ||
        "Unable to load orders. Please check your backend server."
      );
    } finally {
      setLoadingOrders(false);
    }
  };

  const openOrders = async () => {
    setOrdersOpen(true);
    await fetchOrders();
  };

  const handleOrderStatusChange = async (orderId, status) => {
    try {
      await axios.put(`${ORDER_API_URL}/${orderId}/status`, { status });
      await fetchOrders();
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Unable to update the order status. Please try again."
      );
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(price);

  return (
    <div className="app">
      {/* Announcement bar */}
      <div className="announcement">
        Free shipping on orders over ₱1,500!
      </div>

      {/* Navigation */}
      <header className="navbar">
        <a href="#" className="logo">
          <span className="logo-icon">
            <Store size={23} />
          </span>
          Shop<span>Ease</span>
        </a>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#products">Shop</a>
          <a href="#categories">Categories</a>
          <button type="button" className="nav-text-button" onClick={openOrders}>Orders</button>
        </nav>

        <div className="nav-actions">
          <button
            className="icon-button"
            onClick={openAddForm}
            title="Add product"
          >
            <Plus size={20} />
            <span className="desktop-label">Add Product</span>
          </button>

          <button
            className="cart-button"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart size={21} />
            <span>Cart</span>
            <span className="cart-count">{cartCount}</span>
          </button>
        </div>
      </header>

      {/* Hero section */}
      <section className="hero" id="home">
        <div className="hero-content">
          <span className="hero-tag">WELCOME TO SHOPEASE</span>

          <h1>
            Shopping made
            <br />
            <span>simple and easy.</span>
          </h1>

          <p>
            Discover great products at great prices.
            Everything you need, all in one place.
          </p>

          <a href="#products" className="primary-button">
            Shop Now <ArrowRight size={18} />
          </a>

          <div className="hero-benefits">
            <span>✓ Quality Products</span>
            <span>✓ Great Prices</span>
            <span>✓ Easy Shopping</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-circle">
            <ShoppingBag size={115} strokeWidth={1.2} />
          </div>
          <div className="hero-floating-card">
            <Package size={23} />
            <div>
              <strong>Shop with ease</strong>
              <small>Your favorite finds await</small>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="benefits">
        <div className="benefit">
          <Package size={27} />
          <div>
            <strong>Quality Products</strong>
            <small>Carefully selected items</small>
          </div>
        </div>

        <div className="benefit">
          <ShoppingBag size={27} />
          <div>
            <strong>Easy Shopping</strong>
            <small>Simple shopping experience</small>
          </div>
        </div>

        <div className="benefit">
          <Store size={27} />
          <div>
            <strong>Wide Selection</strong>
            <small>Products for everyone</small>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="products-section" id="products">
        <div className="section-heading">
          <div>
            <span className="section-tag">OUR COLLECTION</span>
            <h2>Explore our products</h2>
            <p>Find something you'll love.</p>
          </div>

          <button
            className="outline-button"
            onClick={openAddForm}
          >
            <Plus size={17} /> Add Product
          </button>
        </div>

        <div className="category-list" id="categories">
          {categories.map((item) => (
            <button
              key={item}
              className={
                category === item
                  ? "category-button active"
                  : "category-button"
              }
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search for products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Product list */}
        {loading ? (
          <div className="empty-state">
            <LoaderCircle className="spinner" size={35} />
            <p>Loading products...</p>
          </div>
        ) : error ? (
          <div className="empty-state error-state">
            <Package size={45} />
            <h3>Connection Error</h3>
            <p>{error}</p>
            <button className="primary-button" onClick={fetchProducts}>
              Try Again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={55} />
            <h3>
              {products.length === 0
                ? "No products yet"
                : "No products found"}
            </h3>
            <p>
              {products.length === 0
                ? "Start building your collection by adding your first product."
                : "Try another search or category."}
            </p>
            {products.length === 0 && (
              <button
                className="primary-button"
                onClick={openAddForm}
              >
                <Plus size={18} /> Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article className="product-card" key={product._id}>
                <div className="product-image">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <ShoppingBag size={65} />
                  )}

                  <span className="product-category">
                    {product.category}
                  </span>
                </div>

                <div className="product-details">
                  <h3>{product.name}</h3>
                  <p className="product-description">
                    {product.description}
                  </p>

                  <div className="product-bottom">
                    <div>
                      <strong className="product-price">
                        {formatPrice(product.price)}
                      </strong>
                      <small>
                        {product.stock > 0
                          ? `${product.stock} in stock`
                          : "Out of stock"}
                      </small>
                    </div>

                    <button
                      className="add-cart-button"
                      disabled={product.stock <= 0}
                      onClick={() => addToCart(product)}
                    >
                      <ShoppingCart size={18} />
                    </button>
                  </div>

                  <div className="product-management">
                    <button
                      type="button"
                      className="edit-product-button"
                      onClick={() => openEditForm(product)}
                    >
                      <Pencil size={15} /> Edit
                    </button>
                    <button
                      type="button"
                      className="delete-product-button"
                      onClick={() => handleDeleteProduct(product)}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <a href="#" className="logo footer-logo">
          Shop<span>Ease</span>
        </a>
        <p>Your everyday shopping destination.</p>
        <small>© 2026 ShopEase. All rights reserved.</small>
      </footer>

      {/* Add product modal */}
      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-tag">PRODUCT MANAGEMENT</span>
                <h2>{editingProduct ? "Edit Product" : "Add New Product"}</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setFormOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <label>Product Name</label>
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Enter product name"
              />

              <label>Description</label>
              <textarea
                required
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Describe your product"
                rows="3"
              />

              <div className="form-row">
                <div>
                  <label>Price (PHP)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label>Stock</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(event) =>
                      setForm({ ...form, stock: event.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <label>Category</label>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              >
                {categories.slice(1).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <label>Product Image URL (optional)</label>
              <input
                type="url"
                value={form.image}
                onChange={(event) =>
                  setForm({ ...form, image: event.target.value })
                }
                placeholder="https://example.com/image.jpg"
              />

              <button
                type="submit"
                className="primary-button submit-button"
                disabled={saving}
              >
                {saving ? "Saving..." : editingProduct ? "Update Product" : "Save Product"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Shopping cart drawer */}
      {cartOpen && (
        <div className="modal-overlay" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cart-header">
              <h2>Your Shopping Cart ({cartCount})</h2>
              <button
                className="close-button"
                onClick={() => setCartOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-state">
                <ShoppingCart size={50} />
                <h3>Your cart is empty</h3>
                <p>Explore our products and add something you like.</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item._id}>
                      <div className="cart-item-image">
                        {item.image ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <ShoppingBag size={28} />
                        )}
                      </div>

                      <div className="cart-item-info">
                        <strong>{item.name}</strong>
                        <span>{formatPrice(item.price)}</span>

                        <div className="quantity-controls">
                          <button
                            onClick={() => updateQuantity(item._id, -1)}
                          >
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item._id, 1)}
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <button
                        className="remove-button"
                        onClick={() =>
                          setCart((previous) =>
                            previous.filter(
                              (product) => product._id !== item._id
                            )
                          )
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div className="cart-total">
                    <span>Total</span>
                    <strong>{formatPrice(cartTotal)}</strong>
                  </div>
                  <p>Review your items and enter your delivery details to place your order.</p>
                  <button
                    className="primary-button submit-button"
                    onClick={() => {
                      setCartOpen(false);
                      setCheckoutOpen(true);
                    }}
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="modal-overlay" onClick={() => setCheckoutOpen(false)}>
          <div className="modal checkout-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="section-tag">SECURE CHECKOUT</span>
                <h2>Delivery details</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setCheckoutOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="checkout-order-summary">
              <strong>Order summary</strong>
              {cart.map((item) => (
                <div className="checkout-summary-row" key={item._id}>
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="checkout-summary-total">
                <span>Total</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
            </div>

            <form onSubmit={handlePlaceOrder}>
              <label>Full Name</label>
              <input
                required
                autoComplete="name"
                value={customer.name}
                onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
                placeholder="Enter your full name"
              />

              <label>Email Address</label>
              <input
                required
                type="email"
                autoComplete="email"
                value={customer.email}
                onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
                placeholder="you@example.com"
              />

              <label>Phone Number</label>
              <input
                required
                type="tel"
                autoComplete="tel"
                value={customer.phone}
                onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                placeholder="09XXXXXXXXX"
              />

              <label>Delivery Address</label>
              <textarea
                required
                autoComplete="street-address"
                rows="3"
                value={customer.address}
                onChange={(event) => setCustomer({ ...customer, address: event.target.value })}
                placeholder="House number, street, barangay, city, province"
              />

              <p className="checkout-payment-note">
                Demo payment method: Cash on Delivery. Online payments are not connected.
              </p>

              <button
                type="submit"
                className="primary-button submit-button"
                disabled={placingOrder || cart.length === 0}
              >
                {placingOrder ? "Placing Order..." : "Place Order"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order confirmation */}
      {orderSuccess && (
        <div className="modal-overlay" onClick={() => setOrderSuccess(null)}>
          <div className="modal order-success-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="section-tag">ORDER CONFIRMED</span>
                <h2>Thank you for shopping!</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setOrderSuccess(null)}>
                <X size={22} />
              </button>
            </div>
            <p>Your order has been saved successfully.</p>
            <div className="order-confirmation-details">
              <p><strong>Order ID:</strong> {orderSuccess._id}</p>
              <p><strong>Total:</strong> {formatPrice(orderSuccess.totalAmount)}</p>
              <p><strong>Status:</strong> {orderSuccess.status}</p>
            </div>
            <button className="primary-button submit-button" onClick={() => setOrderSuccess(null)}>
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* Order management modal */}
      {ordersOpen && (
        <div className="modal-overlay orders-overlay" onClick={() => setOrdersOpen(false)}>
          <div className="modal orders-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="section-tag">SHOP MANAGEMENT</span>
                <h2>Customer Orders</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setOrdersOpen(false)}>
                <X size={22} />
              </button>
            </div>

            {loadingOrders ? (
              <div className="empty-state">
                <LoaderCircle className="spinner" size={35} />
                <p>Loading orders...</p>
              </div>
            ) : ordersError ? (
              <div className="empty-state error-state">
                <p>{ordersError}</p>
                <button className="primary-button" onClick={fetchOrders}>Try Again</button>
              </div>
            ) : orders.length === 0 ? (
              <div className="empty-state">
                <ClipboardList size={45} />
                <h3>No orders yet</h3>
                <p>Customer orders will appear here after checkout.</p>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <article className="order-card" key={order._id}>
                    <div className="order-card-heading">
                      <div>
                        <strong>Order #{order._id.slice(-8).toUpperCase()}</strong>
                        <small>{new Date(order.createdAt).toLocaleString()}</small>
                      </div>
                      <strong>{formatPrice(order.totalAmount)}</strong>
                    </div>

                    <div className="order-customer-details">
                      <p><strong>Customer:</strong> {order.customer.name}</p>
                      <p><strong>Email:</strong> {order.customer.email}</p>
                      <p><strong>Phone:</strong> {order.customer.phone}</p>
                      <p><strong>Address:</strong> {order.customer.address}</p>
                    </div>

                    <div className="order-products">
                      <strong>Items</strong>
                      {order.items.map((item, index) => (
                        <div className="checkout-summary-row" key={`${order._id}-${index}`}>
                          <span>{item.name} × {item.quantity}</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="order-status-control">
                      <label htmlFor={`status-${order._id}`}>Order status</label>
                      <select
                        id={`status-${order._id}`}
                        value={order.status}
                        onChange={(event) => handleOrderStatusChange(order._id, event.target.value)}
                      >
                        {["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
