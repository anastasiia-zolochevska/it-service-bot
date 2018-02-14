export function processOpenOrdersRequest() {
    var orders = getOpenOrderS();
    let response = '';
    for (let i in orders) {
        response += `Order #${orders[i].id}: 
              
        "${orders[i].name}" 
        Submited on ${orders[i].orderDate}  
        Due on ${orders[i].dueDate} \n`;
    }
    return response;
}


export function processClosedOrdersRequest() {
    var orders = getClosedOrders();
    let response = '';
    for (let i in orders) {
        response += `Order #${orders[i].id}: 
              
        "${orders[i].name}" 
        Submited on ${orders[i].orderDate}  
        Completed on ${orders[i].dueDate} \n`;
    }
    return response;
}


export function callOrderService(userId:string, deviceClass:string, osVersion: string, platform:string): Promise<string>{

    return  new Promise((resolve, reject) => 
        setTimeout(resolve('52525'), 10000)
      );

}


interface Computer {
    deviceClass: string;
    osVersion: string;
    platform: string;
}

interface Order {
    id: string;
    name: string;
    orderDate: string;
    dueDate?: string;
    closedDate?: string;
}

var openOrders: { [index: string]: Order } = {
    5107319: { "id": "5107319", "name": "Administration Account Request", "orderDate": "09/14/2017", "dueDate": "09/18/2017" },
    4972166: { "id": "4972166", "name": "Server Hosting - dmzServer (virtual) - New", "orderDate": "08/17/2017", "dueDate": "08/21/2017" }
};

var closedOrders: { [index: string]: Order } = {
    5112795: { "id": "5112795", "name": "Email Request", "orderDate": "09/16/2017", "closedDate": "09/18/2017" },
    4905025: { "id": "4905025", "name": "Mobile Device Management, Mobile PIM", "orderDate": "08/07/2017", "closedDate": "08/07/2017" },
    4453340: { "id": "4453340", "name": "Cloud Workplace - New", "orderDate": "03/23/2017", "closedDate": "03/24/2017" }
};


function getOpenOrderS() {
    var ordersArray = Object.keys(openOrders);
    var ordersToReturn = [];

    for (let k in ordersArray) {
        ordersToReturn.push(openOrders[ordersArray[k]])
    }
    return ordersToReturn;
}
function getOpenOrder(id: string) {
    return openOrders[id];
}

function getClosedOrders() {
    var ordersArray = Object.keys(closedOrders);
    var ordersToReturn = [];

    for (let k in ordersArray) {
        ordersToReturn.push(closedOrders[ordersArray[k]])
    }
    return ordersToReturn;
}
function getClosedOrder(id: string) {
    return closedOrders[id];
}

function checkMyOrder(id: string) {
    id = id.toString();
    if (Object.keys(openOrders).indexOf(id) > -1) {
        return { "status": "open", "r": getOpenOrder(id) };
    } else if (Object.keys(closedOrders).indexOf(id) > -1) {
        return { "status": "closed", "r": getClosedOrder(id) };
    } else {
        return { "status": "error", "r": "I can't find your Order!" }
    }
}
