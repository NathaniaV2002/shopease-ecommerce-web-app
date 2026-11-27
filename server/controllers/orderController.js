
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

// CREATE ORDER
const createOrder = async (req, res) => {
  const { customer, items } = req.body;

  if (
    !customer?.name ||
    !customer?.email ||
    !customer?.phone ||
    !customer?.address ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      message: "Please provide customer details and order items."
    });
  }

  const session = await mongoose.startSession();

  try {
    let createdOrder;

    await session.withTransaction(async () => {
      const orderItems = [];
      let totalAmount = 0;

      for (const item of items) {
        if (
          !mongoose.Types.ObjectId.isValid(item.productId) ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
        ) {
          throw new Error("Invalid product or quantity.");
        }

        const product = await Product.findById(item.productId).session(session);

        if (!product) {
          throw new Error("A product in your cart no longer exists.");
        }

        if (product.stock < item.quantity) {
          throw new Error(`Not enough stock for ${product.name}.`);
        }

        product.stock -= item.quantity;
        await product.save({ session });

        orderItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity
        });

        totalAmount += product.price * item.quantity;
      }

      const orders = await Order.create(
        [{
          customer,
          items: orderItems,
          totalAmount,
          status: "Pending"
        }],
        { session }
      );

      createdOrder = orders[0];
    });

    res.status(201).json({
      message: "Order placed successfully!",
      order: createdOrder
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

// GET ALL ORDERS
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.product", "name")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE ORDER STATUS
const updateOrderStatus = async (req, res) => {
  try {
    const allowedStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled"
    ];

    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status."
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.json({
      message: "Order status updated successfully!",
      order
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  updateOrderStatus
};
