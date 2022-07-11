if(process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}
const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const Joi = require('joi');

const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const Post = require('./models/post');
const Review = require('./models/review');

const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');

const dbURL = process.env.DB_URL || 'mongodb://localhost:27017/write-it-down';
const MongoStore = require('connect-mongo');
// 'mongodb://localhost:27017/write-it-down'
const {isLoggedIn, isAuthor, isReviewAuthor, validatePost, validateReview} = require('./middleware');
mongoose.connect(dbURL);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
const secret = process.env.SECRET || 'thisshouldbeabettersecret!'
const sessionConfig = {
    store: MongoStore.create({
        mongoUrl: dbURL,
        touchAfter: 24*3600
    }),
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
  
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next)=> {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})
app.get('/posts', catchAsync(async (req, res)=> {
    const posts = await Post.find({}).populate('author');
    res.render('posts/index.ejs', {posts});
}))
app.get('/posts/new', isLoggedIn, (req, res)=> {
    res.render('posts/new.ejs');
})
app.get('/posts/:id',catchAsync(async (req, res)=> {
    const {id} = req.params;
    const post = await Post.findById(id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    if(!post) {
        req.flash('error', "Oops! The post doesn't exist.");
        res.redirect('/posts');
    }
    res.render('posts/show.ejs', {post});
}))
app.put('/posts/:id', isLoggedIn, isAuthor, catchAsync(async(req, res)=> {
    const {id} = req.params;
    const post = await Post.findByIdAndUpdate(id, {...req.body.post});
    if(!post) {
        req.flash('error', "Oops! The post doesn't exist.");
        res.redirect('/posts');
    }
    req.flash('success', 'Successfully updated the post!');
    res.redirect(`posts/${id}`);
}))
app.delete('/posts/:id', isLoggedIn, isAuthor, catchAsync(async(req, res)=> {
    const {id} = req.params;
    const post = await Post.findByIdAndDelete(id);
    if(!post) {
        req.flash('error', "Oops! The post doesn't exist.");
        res.redirect('/posts');
    }
    req.flash('success', 'Successfully deleted the post!');
    res.redirect('/posts');
}))
app.get('/posts/:id/edit', isLoggedIn, catchAsync(async(req, res)=> {
    const {id} = req.params;
    const post = await Post.findById(id);
    if(!post) {
        req.flash('error', "Oops! The post doesn't exist.");
        res.redirect('/posts');
    }
    res.render('posts/edit.ejs', {post});
}))
app.post('/posts', isLoggedIn, validatePost, catchAsync(async (req, res)=> {
    const post = new Post(req.body.post);
    post.author = req.user._id;
    await post.save();
    req.flash('success', 'Successfully Added a Post!');
    res.redirect('/posts');
}))

app.post('/posts/:id/reviews', isLoggedIn, validateReview, catchAsync(async (req, res)=> {
    const {id} = req.params;
    const {review} = req.body;
    const newReview = new Review(review);
    const post = await Post.findById(id);
    newReview.author = req.user._id;
    post.reviews.push(newReview);
    newReview.save();
    post.save();
    req.flash('success', 'Successfully Added the Review!');
    res.redirect(`/posts/${id}`);
}))
app.delete('/posts/:id/reviews/:reviewId', isLoggedIn, isReviewAuthor, catchAsync(async (req, res)=> {
    const {id, reviewId} = req.params;
    await Post.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);
    req.flash('success', 'Successfully Deleted the Review!');
    res.redirect(`/posts/${id}`);
}))
app.get('/register', (req, res)=> {
    res.render('users/register.ejs');
})
app.post('/register', async (req, res)=> {
    try {
        const {username, email, password} = req.body;
        const user = new User({email, username});
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, function(err) {
            if(err) return next(err);
            req.flash('success', 'Welcome to thewisewriter!');
            res.redirect('/posts');
        })
    } catch(e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
})
app.get('/login', (req, res)=> {
    res.render('users/login.ejs');
})
app.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), (req, res) => {
    req.flash('success', 'Welcome back!');
    res.redirect('/posts');
})
app.get('/logout', (req, res)=> {
    req.logout(function(error) {
        if(error) return next(error);
        req.flash('success', 'Goodbye!');
        res.redirect('/posts');
    });
})
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found!', 404));
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Something Went Wrong';
    res.status(statusCode).render('error.ejs', { err });
})

app.listen(3000, () => {
    console.log("I am listening!");
  })