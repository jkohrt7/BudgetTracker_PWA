let transactions = [];
let myChart;

//Executes when page is loaded.
//GETs all transactions and saves them in the global transactions variable
//Then calls functions to populate total, table, chart.
fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(data => {
    // save db data on global variable
    transactions = data;

    populateTotal();
    populateTable();
    populateChart();
  });

//Reduces transactions to a total value and displays it
function populateTotal() {
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

//Populates table with every saved transaction model
function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

//Uses Chart.js to create a chart of the transactions
function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [{
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
        }]
    }
  });
}

//Uses the input fields to create a new transaction document, display it, and send it to the db.
//If offline, the transaction is temporarily stored in indexeddb.
function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();
  
  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {    
    return response.json();
  })
  .then(data => {
    if (data.errors) {
      errorEl.textContent = "Missing Information";
    }
    else {
      // clear form
      nameEl.value = "";
      amountEl.value = "";
    }
  })
  .catch(err => {
    // fetch failed, so save in indexed db
    saveRecord(transaction);

    // clear form
    nameEl.value = "";
    amountEl.value = "";
  });
}

//Saves a transaction (THE FINANCIAL KIND NOT THE INDEXEDDB KIND) to indexedDB.
function saveRecord(transaction) {
  let request = window.indexedDB.open("transactions")
  
  //Creates schema when a db doesn't exist or is a newer version
  request.onupgradeneeded = event => {
    const db = event.target.result;
    console.log("Onupgrade Called")

    //'Table' for transactions
    const transactionStorage = db.createObjectStore("transactionRecord", {autoIncrement: true}) //TODO: keypath
  }

  request.onerror = function(event) {
    console.log("Something is wrong in index.js: " + event);
  }

  request.onsuccess = function(event) {
    const db = event.target.result;
    //Select correct ObjectStore, then add the transaction model to it.
    const tx = db.transaction(["transactionRecord"], "readwrite");
    const transactionStorage = tx.objectStore("transactionRecord");
    transactionStorage.add(transaction)
  };
}

//TODO: decide how the stuff in indexeddb will be retrieved.
//Perhaps a "when back online" listener.

document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};
