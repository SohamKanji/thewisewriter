const {postSchema, reviewSchema} = require('./schemas');
const Review = require('./models/review');
const Post = require('./models/post');
const ExpressError = require('./utils/ExpressError');

module.exports.isLoggedIn = function(req, res, next) {
    if(!req.isAuthenticated()) {
        req.flash('error', 'You need to be logged in!');
        res.redirect('/login');
    } else next();
}

module.exports.isAuthor = function(req, res, next) {
    const {id} = req.params;
    const post = Post.findById(id);
    // if(!post.author.equals(req.user._id)) {
    //     req.flash('error', 'You do not have permission to do that!');
    //     res.redirect(`/posts/${id}`);
    // }
    next();
}

module.exports.isReviewAuthor = function(req, res, next) {
    const {id, reviewId} = req.params;
    const review = Review.findById(reviewId);
    if(!review.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        res.redirect(`/posts/${id}`);
    }
    next();
}

module.exports.validatePost = (req, res, next) => {
    const { error } = postSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else next();
} 

module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else next();
}