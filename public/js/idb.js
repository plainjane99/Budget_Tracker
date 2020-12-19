// file that handles IndexedDB functionality for the application

// ----------------- creates the functionality to save data to IndexedDb when the app is running offline---------------

// establish a connection to IndexedDb
// create a variable to hold db connection
let db;
// create 'request' variable to act as an event listener for the database
// open the connection to the database using indexedDB.open() method
// 'budget_tracker' database at version 1
const request = indexedDB.open('budget_tracker', 1);

// once database is opened, we need to create the container that stores the data
// in indexedDb, an "object store" holds the data
// create an event listener to wait for the connection to occur
// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
    // save a reference to the database 
    const db = event.target.result;
    // create an object store (table) called `new_transaction`, set it to have an auto incrementing primary key of sorts 
    db.createObjectStore('new_transaction', { autoIncrement: true });
};

// upon a successful connection to the database, store the resulting database object to the global variable db we created earlier
request.onsuccess = function (event) {
    // when db is successfully created with its object store (from onupgradedneeded event above) or simply established a connection, save reference to db in global variable
    db = event.target.result;

    // check if app is online, if yes run uploadTransaction() function to send all local db data to api
    if (navigator.onLine) {
        // we haven't created this yet, but we will soon, so let's comment it out for now
        uploadTransaction();
    }
};

// event handler to inform us if anything ever goes wrong with the database interaction
request.onerror = function (event) {
    // log error here
    console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a new transaction and there's no internet connection
function saveRecord(record) {
    // open a new transaction with the database with read and write permissions 
    const transaction = db.transaction(['new_transaction'], 'readwrite');

    // access the object store for `new_transaction`
    const transactionObjectStore = transaction.objectStore('new_transaction');

    // add record to your store with add method
    transactionObjectStore.add(record);
}

// ----------------- creates the functionality to upload the saved data from IndexedDb when the app is back online---------------

function uploadTransaction() {
    // open a transaction on your db
    const transaction = db.transaction(['new_transaction'], 'readwrite');

    // access your object store
    const transactionObjectStore = transaction.objectStore('new_transaction');

    // get all records from store and set to a variable
    const getAll = transactionObjectStore.getAll();

    // upon a successful .getAll() execution, run this function
    // Because the object stores can be used for both small and large file storage, 
    // the .getAll() method above is an asynchronous function that 
    // we have to attach an event handler to in order to retrieve the data
    // the getAll variable we created above will have a .result property 
    // that's an array of all the data we retrieved from the new_transaction object store
    getAll.onsuccess = function () {
        // if there was data in indexedDb's store, let's send it to the api server
        if (getAll.result.length > 0) {
            fetch('/api/transaction', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(serverResponse => {
                    if (serverResponse.message) {
                        throw new Error(serverResponse);
                    }
                    // open one more transaction
                    const transaction = db.transaction(['new_transaction'], 'readwrite');
                    // access the new_transaction object store
                    const transactionObjectStore = transaction.objectStore('new_transaction');
                    // clear all items in your store
                    transactionObjectStore.clear();

                    alert('All saved transactions has been submitted!');
                })
                .catch(err => {
                    console.log(err);
                });
        }
    };
}

// listen for app coming back online
window.addEventListener('online', uploadTransaction);