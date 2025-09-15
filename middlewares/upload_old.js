const multer = require("multer");
const path = require("path");

// Configure the storage
const storage = multer.diskStorage({
  // Set the destination to the "images" folder
  destination: function (req, file, cb) {
    // Path to the folder where the images will be saved
   cb(null, path.join(__dirname, '../../Medifit_Folder/Main-Medifit/src/assets/img')); 
  },

  

  // Define how the filename will be stored
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + file.originalname;
    // const filePath = path.join(__dirname, '../Images', uniqueSuffix);
    cb(null, uniqueSuffix); // Save file with unique name to avoid overwriting
    // console.log(file); // Log the file for debugging purposes
    req.image = file;  // Optionally store the file object in the request
    // req.imageUrl = `{uniqueSuffix}`;
  }
});

// Create an upload instance with the defined storage
const upload = multer({ storage: storage });

// Export the upload instance
module.exports = upload;