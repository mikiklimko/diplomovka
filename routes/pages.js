const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('home');
})

router.get('/dashboard', (req, res) => {
    res.render('dashboard');
})

router.get('/index', (req, res) => {
    res.render('index');
});


router.get('/login', (req, res) => {
    res.render('login');
})

router.get('/doc', (req, res)=>{
    res.render('doc');
    
})

module.exports = router;