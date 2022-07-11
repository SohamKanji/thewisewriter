const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Review = require('./review');
const PostSchema = new Schema ({
    title: String,
    description: String,
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
})
PostSchema.post('findOneAndDelete', async function(post) {
    if(post) {
        await Review.deleteMany({
            _id: {
                $in: post.reviews
            }
        })
    }
})
module.exports = mongoose.model('Post', PostSchema);