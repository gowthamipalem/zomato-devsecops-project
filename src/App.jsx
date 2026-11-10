
import React, { useState } from "react";

const restaurants = [
  {
    id: 1,
    name: "Paradise Biryani",
    category: "Biryani, North Indian",
    rating: "4.4",
    time: "30 min",
    price: "₹250 for one",
    emoji: "🍛"
  },
  {
    id: 2,
    name: "Pizza Palace",
    category: "Pizza, Italian",
    rating: "4.2",
    time: "25 min",
    price: "₹200 for one",
    emoji: "🍕"
  },
  {
    id: 3,
    name: "Burger Hub",
    category: "Burgers, Fast Food",
    rating: "4.1",
    time: "20 min",
    price: "₹150 for one",
    emoji: "🍔"
  },
  {
    id: 4,
    name: "Sweet Treats",
    category: "Desserts, Ice Cream",
    rating: "4.5",
    time: "20 min",
    price: "₹120 for one",
    emoji: "🍰"
  }
];

function App() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name.toLowerCase().includes(search.toLowerCase()) ||
    restaurant.category.toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(restaurant) {
    setCart((previous) => [...previous, restaurant]);
  }

  return (
    <div className="app">
      <header className="navbar">
        <h1 className="logo">zomato<span>.</span></h1>
        <div className="nav-right">
          <span>Delivering to your location</span>
          <button className="cart-button">
            🛒 Cart ({cart.length})
          </button>
        </div>
      </header>

      <section className="hero">
        <h2>Discover the best food near you</h2>
        <p>Order delicious food from your favourite restaurants.</p>

        <input
          type="text"
          placeholder="Search restaurants or cuisines..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </section>

      <main className="container">
        <h2>Popular Restaurants</h2>
        <p className="subtitle">Explore restaurants and order your food.</p>

        <div className="restaurant-grid">
          {filteredRestaurants.map((restaurant) => (
            <div className="restaurant-card" key={restaurant.id}>
              <div className="food-image">{restaurant.emoji}</div>

              <div className="restaurant-info">
                <h3>{restaurant.name}</h3>
                <p>{restaurant.category}</p>

                <div className="details">
                  <span>⭐ {restaurant.rating}</span>
                  <span>{restaurant.time}</span>
                </div>

                <p className="price">{restaurant.price}</p>

                <button onClick={() => addToCart(restaurant)}>
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredRestaurants.length === 0 && (
          <p className="empty">No restaurants found.</p>
        )}

        <section className="cart-section">
          <h2>Your Cart</h2>
          {cart.length === 0 ? (
            <p>Your cart is empty. Add your favourite food!</p>
          ) : (
            <>
              {cart.map((item, index) => (
                <p key={`${item.id}-${index}`}>
                  {item.emoji} {item.name} - {item.price}
                </p>
              ))}
              <strong>Total items: {cart.length}</strong>
            </>
          )}
        </section>
      </main>

      <footer>
        <p>Food Delivery Demo | DevSecOps Project</p>
      </footer>
    </div>
  );
}

export default App;
