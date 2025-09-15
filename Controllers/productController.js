const Product = require("../models/Product");
const User = require("../models/User");
const bcrypt = require('bcryptjs');
const { cloudinary } = require('../Config/cloudinary');

const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

const addProduct = async (req, res, next) => {
  const { type, rating, name, price, description, key_benefits, sale_percentage, price_after_sale } = req.body;
  
  try {
    let imageUrl = '';
    
    // إذا تم رفع ملف
    if (req.file) {
      imageUrl = req.file.path; // Cloudinary يعيد الرابط في path
    } 
    // إذا تم إرسال رابط
    else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    } 
    // إذا لم يتم إرسال صورة
    else {
      return res.status(400).json({ error: "Image is required" });
    }

    const newProduct = new Product({ 
      type, 
      rating, 
      name, 
      price, 
      image: imageUrl, 
      description,
      key_benefits,
      sale_percentage,
      price_after_sale
    });
    
    await newProduct.save();
    res.status(201).json({ 
      message: "Product added successfully"
    });
  } catch (error) {
    next(error);
  }
};

const editProduct = async (req, res, next) => {
  const { id } = req.params;
  const { type, rating, name, price, description, key_benefits, sale_percentage, price_after_sale } = req.body;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // تحديث الصورة إذا تم رفع صورة جديدة
    if (req.file) {
      // حذف الصورة القديمة من Cloudinary إذا كانت موجودة
      if (product.image && product.image.includes('cloudinary')) {
        const publicId = product.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`medifit-products/${publicId}`);
      }
      product.image = req.file.path;
    } else if (req.body.imageUrl) {
      product.image = req.body.imageUrl;
    }

    // تحديث باقي الحقول
    product.type = type || product.type;
    product.rating = rating || product.rating;
    product.name = name || product.name;
    product.price = price || product.price;
    product.description = description || product.description;
    product.key_benefits = key_benefits || product.key_benefits;
    product.sale_percentage = sale_percentage !== undefined ? sale_percentage : product.sale_percentage;
    product.price_after_sale = price_after_sale !== undefined ? price_after_sale : product.price_after_sale;

    await product.save();
    res.json({ 
      message: "Product updated successfully",
      product 
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // حذف الصورة من Cloudinary
    if (product.image && product.image.includes('cloudinary')) {
      const publicId = product.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`medifit-products/${publicId}`);
    }

    // استخدم Product مع P كبيرة وليس product
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteAllProducts = async (req, res, next) => {
  const { password } = req.body;
  try {
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Password incorrect" });
    }

    // حذف جميع الصور من Cloudinary
    const products = await Product.find();
    for (const product of products) {
      if (product.image && product.image.includes('cloudinary')) {
        const publicId = product.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`medifit-products/${publicId}`);
      }
    }

    await Product.deleteMany({});
    res.status(200).json({ message: "All products deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllProducts, addProduct, editProduct, deleteProduct, deleteAllProducts };