const { Client } = require("pg");
const axios = require("axios");

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: 5432
};
const apiKey = process.env.GOOGLE_SPEED_API_KEY;


const urls = [
    'https://www.clover.com/us/en/help/tips-app-view-and-sort-tips/', 'https://www.clover.com/us/en/help/tips-app/', 'https://www.clover.com/us/en/help/tools-for-your-business/', 'https://www.clover.com/us/en/help/transactions-app-find-a-transaction/', 
    'https://www.clover.com/us/en/help/transactions-app-manage-transactions/', 'https://www.clover.com/us/en/help/transactions-app/', 'https://www.clover.com/us/en/help/troubleshoot-clover-go/', 'https://www.clover.com/us/en/help/troubleshoot-clover-station-2018/', 'https://www.clover.com/us/en/help/troubleshoot-your-clover-flex/', 'https://www.clover.com/us/en/help/troubleshoot-your-clover-mini/', 'https://www.clover.com/us/en/help/troubleshoot-your-web-dashboard/', 'https://www.clover.com/us/en/help/troubleshooting-clover-mobile/', 'https://www.clover.com/us/en/help/troubleshooting-clover-station/', 'https://www.clover.com/us/en/help/troubleshooting/', 'https://www.clover.com/us/en/help/two-factor-authentication/', 
    'https://www.clover.com/us/en/help/unlock-a-clover-device-with-a-fingerprint/', 'https://www.clover.com/us/en/help/unlock-your-clover-device-with-an-employee-card/', 'https://www.clover.com/us/en/help/use-an-inventory-spreadsheet', 'https://www.clover.com/us/en/help/use-api-tokens/', 'https://www.clover.com/us/en/help/use-item-categories/', 'https://www.clover.com/us/en/help/use-item-labels/', 'https://www.clover.com/us/en/help/use-item-modifiers/', 'https://www.clover.com/us/en/help/use-quick-access-to-unlock-a-clover-device/', 'https://www.clover.com/us/en/help/use-tips/', 'https://www.clover.com/us/en/help/using-the-app-market/', 'https://www.clover.com/us/en/help/view-and-manage-orders/', 'https://www.clover.com/us/en/help/view-device-validation-submission-guidelines/', 'https://www.clover.com/us/en/help/view-key-numbers-for-your-business/', 'https://www.clover.com/us/en/help/view-reports-on-clover-devices/', 'https://www.clover.com/us/en/help/view-reports-on-the-web-dashboard/', 'https://www.clover.com/us/en/help/void-a-payment/', 'https://www.clover.com/us/en/help/web-dashboard-for-managing-your-clover-account/', 
    'https://www.clover.com/us/en/help/web-dashboard-navigation/', 'https://www.clover.com/us/en/help/weight-scales-troubleshooting/', 'https://www.clover.com/us/en/help/wireless-manager-app/', 'https://www.clover.com/us/en/help/wireless-manager-manage-your-3g-connection/', 'https://www.clover.com/us/en/help/work-with-stock-quantities/', 'https://www.clover.com/us/en/help/your-clover-account/', 'https://www.clover.com/your-business/appointment', 'https://www.clover.com/your-business/quick-service-restaurants', 'https://www.clover.com/your-business/retail'
    ];


const apiHelper = async(url, strategy) => {
  const response = await axios.get(`https://www.googleapis.com/pagespeedonline/v4/runPagespeed`, {
        params: {
            url: url,
            key: apiKey,
            strategy: strategy,
        }
    });
    
    const results = response.data;
    const ruleResults = results.formattedResults.ruleResults;
    
    const website = {
        avoid_landing_page_redirects: ruleResults.AvoidLandingPageRedirects.ruleImpact,
        enable_gzip_compression: ruleResults.EnableGzipCompression.ruleImpact,
        leverage_browser_caching: ruleResults.LeverageBrowserCaching.ruleImpact,
        main_server_response_time: ruleResults.MainResourceServerResponseTime.ruleImpact,
        minify_css: ruleResults.MinifyCss.ruleImpact,
        minify_html: ruleResults.MinifyHTML.ruleImpact,
        minify_javascript: ruleResults.MinifyJavaScript.ruleImpact,
        minimize_render_blocking_resources: ruleResults.MinimizeRenderBlockingResources.ruleImpact,
        optimize_images: ruleResults.OptimizeImages.ruleImpact,
        prioritize_visible_content: ruleResults.PrioritizeVisibleContent.ruleImpact,
        };

    const score = {
        website_speed_score: results.ruleGroups.SPEED.score,
        first_contentful_paint: results.loadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS.median,
        dom_content_loaded: results.loadingExperience.metrics.DOM_CONTENT_LOADED_EVENT_FIRED_MS.median,
        mobile: strategy === 'mobile' ? true : false,
        desktop: strategy === 'desktop' ? true : false, 
    };

    return { website: website, score: score };
};

const strategies = ['mobile', 'desktop'];


exports.handler = async(event, context, callback) => {
    // Open database connection
    const client = new Client(dbConfig);
    client.connect()
        .then(() => console.log('Database Connection Successful'))
        .catch((err) => console.error('Database Connection Unsuccessful', err.stack));

    // Call api on all links and add/update data to database
    let n = 0;
    while (n < urls.length) {
        for(let i = 0; i < strategies.length; i++) {
            let url = urls[n];
            let strategy = strategies[i];

            let results = await apiHelper(url, strategy);

            const checkUrlQuery = `SELECT * FROM website WHERE website_url='${url}';`;

            const insertDataQuery = `
                INSERT INTO website (website_url, category_id, avoid_landing_page_redirects, enable_gzip_compression, 
                                    leverage_browser_caching, main_server_response_time, minify_css, minify_html, minify_javascript, 
                                    minimize_render_blocking_resources, optimize_images, prioritize_visible_content) 
                VALUES
                    ('${url}', 1, ${results.website.avoid_landing_page_redirects}, ${results.website.enable_gzip_compression}
                    , ${results.website.leverage_browser_caching}, ${results.website.main_server_response_time}
                    , ${results.website.minify_css}, ${results.website.minify_html}, ${results.website.minify_javascript}
                    , ${results.website.minimize_render_blocking_resources}, ${results.website.optimize_images}
                    , ${results.website.prioritize_visible_content})
                RETURNING website_id`;
        
            const updateRulesQuery = `
                UPDATE website
                SET avoid_landing_page_redirects=${results.website.avoid_landing_page_redirects}, 
                    enable_gzip_compression=${results.website.enable_gzip_compression}, leverage_browser_caching=${results.website.leverage_browser_caching}, 
                    main_server_response_time=${results.website.main_server_response_time}, minify_css=${results.website.minify_css}, 
                    minify_html=${results.website.minify_html}, minify_javascript=${results.website.minify_javascript}, 
                    minimize_render_blocking_resources=${results.website.minimize_render_blocking_resources}, optimize_images=${results.website.optimize_images}, 
                    prioritize_visible_content=${results.website.prioritize_visible_content}
                WHERE website_url='${url}'
                RETURNING website_id`;
            const matchingUrls = await client.query(checkUrlQuery);
            let website_id;
            if(matchingUrls.rowCount === 0) {
                let insertResults = await client.query(insertDataQuery);
                website_id = insertResults.rows[0].website_id;
            } else {
                let updateResults = await client.query(updateRulesQuery);
                website_id = updateResults.rows[0].website_id;
            }
            const insertScoreQuery= `
                INSERT INTO score(website_speed_score, first_contentful_paint, dom_content_loaded, date, mobile, desktop, website_id)
                VALUES( ${results.score.website_speed_score}, ${results.score.first_contentful_paint}, ${results.score.dom_content_loaded}, 
                        current_date, ${results.score.mobile}, ${results.score.desktop}, ${website_id});`;
            await client.query(insertScoreQuery);
        }
        n++;
    }
        
    client.end();
    console.log('API calls successfully added to database');
};
