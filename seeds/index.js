const mongoose = require('mongoose');
const Post = require('../models/post');
mongoose.connect('mongodb://localhost:27017/write-it-down');

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

const addPosts = async () => {
    await Post.deleteMany({});
    for(let i=0; i<50; i++) {
        const newPost = new Post({
            title: "Somethings in the way",
            description: "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).",
            author: '62cc5d793beba6f86c504544'
        });
        await newPost.save();
    }
}

addPosts().then(()=> {
    mongoose.connection.close();
})