const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware to check for API key
const apiKeyMiddleware = (req, res, next) => {
    const userApiKey = req.headers['x-api-key'];
    const validApiKey = process.env.USER_API_KEY; // Your user API key

    if (!userApiKey || userApiKey !== validApiKey) {
        return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
    }
    next();
};

app.use(apiKeyMiddleware);

const apiKey = process.env.FINNHUBAPIKEY;

app.get('/quote', async (req, res) => {
    const symbol = req.query.symbol;
    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}`;
    const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}`;
    
    try {
        // First API call to get the stock quote
        const quoteResponse = await axios.get(quoteUrl, {
            headers: {
                'X-Finnhub-Token': apiKey
            }
        });
        const stockQuote = quoteResponse.data;

        // Second API call to get the stock profile
        const profileResponse = await axios.get(profileUrl, {
            headers: {
                'X-Finnhub-Token': apiKey
            }
        });
        const stockProfile = profileResponse.data;

        let quoteResponseBody = {
            Price: stockQuote.c,
            Change: stockQuote.d,
            ChangePercent: stockQuote.dp,
            DayHigh: stockQuote.h,
            DayLow: stockQuote.l,
            OpenPrice: stockQuote.o,
            PreviousClose: stockQuote.pc,
            Symbol: stockProfile.ticker,
            Name: stockProfile.name
        }

        if(stockProfile.name) {
            res.status(200).send(quoteResponseBody);
        } else {
            res.status(204).send({});
        }

        
    } catch (error) {
        console.error('Error fetching data:', error);
        let errorMessage = {
            message:'Stock server error'
        }
        res.status(500).send(errorMessage);
    }
});

app.get('/watchlist', async (req, res) => {
    const symbols = req.query.symbols.split(',');
    

    const fetchQuoteAndProfile = async (symbol) => {
        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}`;
        const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}`;
        
        try {
            const [quoteResponse, profileResponse] = await Promise.all([
                axios.get(quoteUrl, { headers: { 'X-Finnhub-Token': apiKey } }),
                axios.get(profileUrl, { headers: { 'X-Finnhub-Token': apiKey } })
            ]);
            return {
                Price: quoteResponse.data.c,
                Change:quoteResponse.data.d,
                ChangePercent: quoteResponse.data.dp,
                Symbol: profileResponse.data.ticker,
                Name: profileResponse.data.name
            };
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            return { symbol, error: 'Error fetching data' };
        }
    };

    let finalResponse = [];

    try {
        const results = await Promise.all(symbols.map(fetchQuoteAndProfile));
        results.forEach(element => {
            if(element.Name) {
                finalResponse.push(element);
            }
        });
        if(finalResponse.length >0) {
            res.status(200).send(finalResponse);
        } else {
            res.status(204).send({});
        }
        
    } catch (error) {
        console.error('Error processing watchlist:', error);
        let errorMessage = {
            message:'Stock server error'
        }
        res.status(500).send(errorMessage);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
