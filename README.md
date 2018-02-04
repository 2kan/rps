# Rock Paper Scissors

A fun, asynchronous browser-based implementation of Rock Paper Scissors! Also tracks a player's skill with the [Elo rating system](https://en.wikipedia.org/wiki/Elo_rating_system).

#### Prerequisites:
- An SQL server is installed and running
- A web server is installed and running
- Port 3000 is not in use
- Python 2.7 is installed and added to PATH


#### Installation (not as complex as it looks)

1. Install node.js

2. Through your SQL server's control panel (or command interface), ensure that a database with the name "rps" doesn't currently exist and import the SQL file titled "mariadb_schema.sql". This imports the database schema.

3. Open dbconfig.json and edit the values according to your SQL server configuration

4. Open a node.js command prompt window, change directories to the project folder, and run the below command
	npm install
    
5. Once this has completed, run the below in the same shell:
	node api
    
6. Open a new node.js commant prompt, change to the "web" directory, and run the below commands in order:
	```
    npm install
	cd semantic
	npm install -g gulp
	gulp build
    ```

7. Copy the contents of the "web" directory to your web server directory and access the folder with your favourite web browser (I used Chrome)

	7.1 If you don't have a web server configured, change directories in a new node.js command prompt to the "web" directory
	
	7.2 Run the below command `node test`
	
	7.3 Open your web browser and go to [http://localhost:3001/index.html]()



Notes

- When Semantic is being installed in step 6, use the automatic configuration and approve the default settings if prompted

- Since the database will be initialised with no data, I suggest making two user accounts in the app and running the game in two browser windows (with one in incognito mode)



#### Troubleshooting (windows)

If running `npm install` fails, you will need to install Python 2.7 and some MS build tools. Thankfully this is pretty easy to do. Open a new node.js command prompt window in administrator mode and run the below commands in order:
```
npm install --global node-gyp
npm install --global --production windows-build-tools
npm config set msvs_version 2015 --global
```
Then run: `npm install`

