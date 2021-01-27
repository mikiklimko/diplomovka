const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const app = express();
const nodemailer = require('nodemailer');
const expressfileUpload = require('express-fileupload');
require('dotenv').config()


// parsovanie pre nedefinovany problem s registraciou 
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// views 
app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.static(__dirname + '/public'));


app.use(expressfileUpload());

//nahravanie suboru
app.use(express.static('public'))


app.post('/upload', (req,res) => {
    if(!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("Nenasiel sa subor");
    }
    let uploadFile = req.files.uploadFile;

    uploadFile.mv(`./incoming/${uploadFile.name}`, (err) => {
        if(err) {
            console.log(err);
            res.status(500).send(err);
        }
        res.send(`File ${req.files.uploadFile.name} bolo ulozene uspesne`);
    })
});

//email prihlasenie
var transportet = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.LOG_EMAIL,
        pass: process.env.LOG_PASS
    }
});

//pripojenie databazy 
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'emailverifikacia'
});
//cookie parser
app.use(cookieParser());
connection.connect( (error) =>{
    if(error){
        console.log(error)
    } else {
        console.log("Databaza pripojena")
    }
});

app.use('/', require('./routes/pages'));





// Registracia 
app.post('/', (req, res) => {
    //vygenerovanie ciselnej kombinácie k heslu
    function Store(heslo) {
        var verify = Math.floor((Math.random() * 10000000) + 1);
        // odosielanie overovacieho mailu
        var mailOption = {
            from: 'miki.klimko@gmail.com',
            to: `${req.body.Email}`,
            subject: "Overenie uctu",
            html: `<h1>ODOSLANE SPRAVNE</h1><br> <a href="http://localhost:5000/overenie/?verify=${verify}"> Pre overenie klikny `
        }
        // ulozenie dat

        var userData = { Email: req.body.Email, password: heslo, verification: verify };
        connection.query("INSERT INTO overenie SET ?", userData, (err, result) => {
            if (err) {
                console.log(error)
            } else {
                transportet.sendMail(mailOption, (error, info) => {
                    if (error) {
                        console.log(error)
                    } else {
                        let userdata = {
                            email: `${req.body.Email}`,
                        }
                        
                        res.cookie("UserInfo", userdata);
                        //res.send("<h1>Email bol poslany </h1>"); //res.json skusit
                        //res.status(400).send("Email poslany");
                        console.log("poslane")
                    }
                })
                console.log("Data succesfully insert")
                
            }
        })
    }
    //zakodovanie hesla
    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(req.body.Heslo, salt, function (err, hash) {
            if (err) {
                console.log(err);
            } else {
                Store(hash);
            }

        });
    });

})

//Verifikacia 
app.get('/overenie/', (req, res) => {
    function activateAccount(verification) {
        if (verification == req.query.verify) {
            connection.query("UPDATE overenie SET active = ?", "true", (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    let userdata = {
                        email: `${req.body.Email}`,
                        overenie: "TRUE"
                    }
                    res.cookie("UserInfo", userdata);
                    res.send('<h1>Overenie uctu bolo uspesne</h1>');
                }

            })
        } else {
            res.send("<h1>Verifikacia sa nepodarila </h1>")
        }
    };
    connection.query("SELECT overenie.verification FROM overenie WHERE email = ?", req.cookies.UserInfo.email, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            activateAccount(result[0].verification);

        }
    })
})


// prihlasenie 
app.post('/login', (req, res) => {
    var email = req.body.Email;
    var pass = req.body.Heslo;
    
    function LoginSuccess(){
        let userdata = {
            email: `${req.body.Email}`,
            overenie: "True"
        }
        res.cookie("UserInfo", userdata);
        res.json({ overenie: "true" });
    }
    connection.query('SELECT * FROM overenie WHERE email = ?', email, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            var hash = result[0].password;
            bcrypt.compare(pass, hash, function (err, res) {
                if (err) {
                    res.json({ msg: "ERROR" })
                } else {
                   LoginSuccess(); 
                }
            });
        }
    })
})


app.listen(5000, ( ) => {
    console.log("Server sa spustil na porte 5000");
});




/*Zoznam uloh:
Opraviť verifikaciu
Vytvoriť obnovenie hesla / zaslanie noveho hesla
Rušenie verifikačneho mailu po určitej dobe 
*/