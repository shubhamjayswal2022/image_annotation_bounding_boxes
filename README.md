# Image Box Annotation Tool - MERN Stack

A production-ready full-stack application for uploading images and annotating them with bounding boxes using Pixi.js canvas.

## 🚀 Features

- ✅ **JWT Authentication** - Secure login and registration
- ✅ **Image Upload** - Upload images with Multer
- ✅ **Bounding Box Annotation** - Draw bounding boxes on images
- ✅ **Pixi.js Canvas** - High-performance 2D canvas rendering
- ✅ **MongoDB Storage** - Persistent storage with Mongoose
- ✅ **React + Redux Toolkit** - Modern state management
- ✅ **Fetch & Re-annotate** - Load and edit existing annotations

## 📁 Project Structure

```
.
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Image.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── images.js
│   ├── middleware/
│   │   └── auth.js
│   ├── uploads/          # Uploaded images stored here
│   ├── server.js
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Annotator.jsx    # Pixi.js annotation component
    │   │   └── PrivateRoute.js
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Dashboard.js
    │   │   └── ImageAnnotator.js
    │   ├── store/
    │   │   ├── store.js
    │   │   ├── authSlice.js
    │   │   └── imageSlice.js
    │   ├── utils/
    │   │   └── api.js
    │   └── App.js
    └── package.json
```

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** - Server framework
- **MongoDB** + **Mongoose** - Database and ODM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Frontend
- **React** - UI framework
- **Redux Toolkit** - State management
- **React Router** - Navigation
- **Pixi.js** - 2D canvas rendering
- **Axios** - HTTP client

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or Atlas account)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Configure `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/image-annotation
JWT_SECRET=your_super_secret_jwt_key_change_in_production_12345
NODE_ENV=development
```

5. Create uploads directory:
```bash
mkdir uploads
```

6. Start the server:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Images
- `POST /api/images` - Upload image (requires authentication)
- `GET /api/images` - Get all user's images (requires authentication)
- `GET /api/images/:id` - Get single image (requires authentication)
- `PUT /api/images/:id/annotations` - Update annotations (requires authentication)
- `DELETE /api/images/:id` - Delete image (requires authentication)

## 🎯 Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Upload Image**: Click "Upload Image" button on the dashboard
3. **Annotate**: Click on an image to open the annotator
4. **Draw Boxes**: Click and drag on the image to create bounding boxes
5. **Save**: Click "Save Annotations" to persist your annotations
6. **Edit**: Re-open images to view and modify existing annotations

## 🔒 Authentication

The application uses JWT (JSON Web Tokens) for authentication. Tokens are stored in localStorage and automatically included in API requests via Axios interceptors.

## 📝 Data Models

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Image Model
```javascript
{
  userId: ObjectId (ref: User),
  imageUrl: String,
  annotations: [{
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    label: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## 🎨 Features Explained

### Pixi.js Annotation
- High-performance WebGL/Canvas rendering
- Interactive bounding box drawing
- Visual feedback while drawing (red boxes)
- Existing annotations displayed in green
- Supports click and drag interactions

### Redux Toolkit
- Centralized state management
- Async thunks for API calls
- Persistent authentication state
- Optimistic updates

## 🚢 Production Deployment

### Backend
- Set up MongoDB Atlas or production MongoDB instance
- Configure environment variables
- Use process managers like PM2
- Set up file storage (consider AWS S3 for production)
- Enable HTTPS

### Frontend
- Build production bundle: `npm run build`
- Deploy to Vercel, Netlify, or similar
- Configure environment variables
- Update API URL in production

## 🔐 Security Considerations

- Password hashing with bcrypt
- JWT token expiration
- File upload validation (file type and size)
- CORS configuration
- Authentication middleware on protected routes
- Input validation (add more validation as needed)

## 📚 Additional Features (Future Enhancements)

- Label editor for annotation classes
- Resize/move existing boxes
- Export annotations (YOLO, COCO formats)
- Multi-user collaboration
- Image filters and adjustments
- Annotation history/versioning
- Docker containerization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is for educational purposes.

## 🆘 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network connectivity

### Image Upload Fails
- Check `uploads/` directory exists
- Verify file size limits
- Check file type restrictions

### CORS Errors
- Verify backend CORS configuration
- Check frontend API URL in `.env`

### Token Expiration
- Tokens expire after 7 days
- User will be redirected to login on expiration

---

**Happy Annotating! 🎨**
