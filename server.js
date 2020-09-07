'use strict';

const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.static('./public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

const client = new pg.Client(process.env.DATABASE_URL);

let arrayBooks = [];

app.get('/', homePage);
app.get('/searches/new', newSearches);
app.get('/hello', testPage)
app.post('/searches', search);
app.get('/searches/show', showSearch)
app.get('/books/:bookID', viewDetails)
app.post('/books', addBook)
app.get('/error', ((req, res) => {
    res.render('pages/error');
}))

function homePage(req, res) {
    let SQL = `SELECT * FROM books;`

    client.query(SQL).then(result => {
        res.render("pages/index", { data: result.rows });
    })
    .catch(error => {
        console.log("Error | Can't load database.")
        res.status(500).redirect("error")
    })
}

function newSearches(req, res) {
    // console.log(res.body);
    res.render('pages/searches/new')
}

function search(req, res) {
    arrayBooks = [];
    let searchType = req.body.searchType;
    let textSearch = req.body.search;
    let url = `https://www.googleapis.com/books/v1/volumes?q=${searchType}:${textSearch}`;
    superagent.get(url)
        .then(result => {
            result.body.items.forEach(item => {
                new Book(item);
            })
            res.redirect("searches/show");
        })
        .catch(error => {
            console.log("Error | Can't find any data about your search.")
            res.status(500).redirect("error")
        })

}

function showSearch(req, res) {

    res.render("pages/searches/show", { data: arrayBooks })
}

function viewDetails(req, res) {
    let SQL = `SELECT * FROM books WHERE id=$1;`
    let values = [req.params.bookID];

    client.query(SQL, values).then(data => {
        res.render("pages/books/show", { data: data.rows[0] })
    })
    .catch(error => {
        console.log("Error | Can't load details.")
        res.status(500).redirect("error")
    })
}

function addBook(req,res){
    let {author,title,isbn,image_url,description,bookshelf} = arrayBooks[req.body.id];
    if(bookshelf.length >= 1){ bookshelf = arrayBooks[req.body.id].bookshelf[0]}
    if(author.length >= 1){ author = arrayBooks[req.body.id].author[0]}
    let SQL = `INSERT INTO books (author, title, isbn, image_url, description, bookshelf) VALUES ($1,$2,$3,$4,$5,$6)`
    let safeValues = [author,title,isbn,image_url,description,bookshelf];
    let SQL2 = `SELECT * FROM books WHERE isbn='${isbn}';`

    client.query(SQL,safeValues).then(() =>{
        client.query(SQL2).then(data =>{
            res.redirect(`/books/${data.rows[0].id}`);
        })
        .catch(error => {
            console.log("Error | Can't redirect to details of the book.")
            res.status(500).redirect("error")
        })
    })
    .catch(error => {
        console.log("Error | Book already saved in the database.")
        res.redirect("/")
    })

}

function testPage(req, res) { res.render("index"); };


function Book(data) {
    this.image_url = data.volumeInfo.imageLinks || "";
    if (Object.keys(this.image_url) != 0) { this.image_url = this.image_url.thumbnail } else { this.image_url = "https://i.imgur.com/J5LVHEL.jpg" }
    this.title = data.volumeInfo.title || "Book title not available ";
    this.author = data.volumeInfo.authors || "Author name not available";
    this.description = data.volumeInfo.description || "Descreption not available";
    this.isbn = data.volumeInfo.industryIdentifiers || "";
    if (Object.keys(this.isbn) != 0) { this.isbn = this.isbn[0].identifier } else { this.isbn = "123456789" }
    this.bookshelf = data.volumeInfo.categories || "Not available.";
    

    arrayBooks.push(this);
}

app.use("*", (req, res) => {
    res.status(404).redirect("error");
});

app.use((error, req, res) => {
    res.status(500).redirect("error");
});

client.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`Listening on ${PORT}`);
    })
})
