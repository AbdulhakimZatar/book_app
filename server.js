'use strict';

const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.static('./public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

const client = new pg.Client(process.env.DATABASE_URL);

let arrayBooks = [];

app.get('/', homePage);
app.get('/searches/new', newSearches);
app.get('/hello', testPage);
app.post('/searches', search);
app.get('/searches/show', showSearch);
app.get('/books/:bookID', viewDetails);
app.put('/books/:bookID', updateDetails);
app.delete('/books/:bookID', deleteBook);
app.post('/books', addBook);
app.get('/error', ((req, res) => {
    res.render('pages/error');
}))

function homePage(req, res) {
    let SQL = `SELECT * FROM books;`

    client.query(SQL).then(result => {
        res.render("pages/index", { data: result.rows });
    })
        .catch(error => {
            let errorReason = "Error | Can't load database.";
            console.log(errorReason);
            res.status(500).render("pages/error", { data: errorReason });
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
            let errorReason = "Error | Can't find any data about your search.";
            console.log(errorReason);
            res.status(500).render("pages/error", { data: errorReason });
        })

}

function showSearch(req, res) {

    res.render("pages/searches/show", { data: arrayBooks })
}

function viewDetails(req, res) {
    let SQL = `SELECT * FROM books WHERE id=$1;`
    let values = [req.params.bookID];

    let SQL2 = `SELECT DISTINCT name FROM bookshelves;`


    client.query(SQL, values).then(data => {
        // console.log(data.rows[0])
        let SQL3 = `SELECT * FROM bookshelves WHERE id=${data.rows[0].bookshelf_id};`
        client.query(SQL2).then(data2 => {
            client.query(SQL3).then((data3) => {
                res.render("pages/books/show", { data: data.rows[0], data2: data2.rows, data3: data3.rows[0] })
            })

        })

    })
        .catch(error => {
            let errorReason = "Error | Can't load details.";
            console.log(errorReason);
            res.status(500).render("pages/error", { data: errorReason });
        })
}

function updateDetails(req, res) {
    // console.log(req.params.bookID);
    // console.log(req.body);
    let { author, title, isbn, image_url, description, bookshelf } = req.body;
    let SQL2 = `SELECT * FROM bookshelves WHERE name='${bookshelf}';`

    client.query(SQL2).then((data2) => {
        let bookshelf_id = data2.rows[0].id;
        let SQL = `UPDATE books SET author=$1, title=$2, isbn=$3, image_url=$4, description=$5, bookshelf_id=$6 WHERE id=$7`
        let safeValues = [author, title, isbn, image_url, description, bookshelf_id, req.params.bookID];
        client.query(SQL, safeValues).then(() => {
            res.redirect(`/books/${req.params.bookID}`)
        })
            .catch(error => {
                let errorReason = "Error | Can't update details of the book."
                console.log(errorReason);
                res.status(500).render("pages/error", { data: errorReason });
            })
    })

}

function deleteBook(req, res) {
    let SQL = `DELETE FROM books WHERE id=$1`;
    let safeValue = [req.params.bookID];
    client.query(SQL, safeValue).then(() => {
        res.redirect('/')
    })
        .catch(error => {
            let errorReason = "Error | Can't delete book."
            console.log(errorReason);
            res.status(500).render("pages/error", { data: errorReason });
        })
}

function addBook(req, res) {
    let { author, title, isbn, image_url, description, bookshelf } = arrayBooks[req.body.id];
    if (author.length >= 1) { author = arrayBooks[req.body.id].author[0] }
    if (bookshelf.length >= 1) { bookshelf = arrayBooks[req.body.id].bookshelf[0] }

    let SQL3 = `INSERT INTO bookshelves (name) VALUES ($1)`
    let SQL4 = `SELECT * FROM bookshelves WHERE name='${bookshelf}';`
    let safeValues3 = [bookshelf];

    client.query(SQL3, safeValues3).then(() => {
        client.query(SQL4).then((data) => {
            let bookshelf_id = data.rows[0].id;
            let SQL = `INSERT INTO books (author, title, isbn, image_url, description, bookshelf_id) VALUES ($1,$2,$3,$4,$5,$6)`
            let safeValues = [author, title, isbn, image_url, description, bookshelf_id];
            let SQL2 = `SELECT * FROM books WHERE isbn='${isbn}';`

            client.query(SQL, safeValues).then(() => {
                client.query(SQL2).then(data => {
                    res.redirect(`/books/${data.rows[0].id}`);
                })
                    .catch(error => {
                        let errorReason = "Error | Can't redirect to details of the book."
                        console.log(errorReason);
                        res.status(500).render("pages/error", { data: errorReason });
                    })
            })
                .catch(error => {
                    console.log("Error | Book already saved in the database.")
                    res.redirect("/")
                })
        })
    })
        .catch(() => {
            console.log("Bookshelf already in DB.")
        })

}

function testPage(req, res) { res.render("index"); };


function Book(data) {
    this.image_url = data.volumeInfo.imageLinks || "";
    if (Object.keys(this.image_url) != 0) { this.image_url = this.image_url.thumbnail } else { this.image_url = "https://i.imgur.com/J5LVHEL.jpg" }
    this.title = data.volumeInfo.title || "Book title not available";
    this.author = data.volumeInfo.authors || ["Author name not available"];
    this.description = data.volumeInfo.description || "Descreption not available";
    this.isbn = data.volumeInfo.industryIdentifiers || "";
    if (Object.keys(this.isbn) != 0) { this.isbn = this.isbn[0].identifier } else { this.isbn = "123456789" }
    this.bookshelf = data.volumeInfo.categories || ["Not available."];

    arrayBooks.push(this);
}

app.use("*", (req, res) => {
    let errorReason = "Error | Wrong page."
    console.log(errorReason);
    res.status(404).render("pages/error", { data: errorReason });
});

app.use((error, req, res) => {
    let errorReason = "Error | Something went wrong."
    console.log(errorReason);
    res.status(500).render("pages/error", { data: errorReason });
});

client.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`Listening on ${PORT}`);
    })
})
