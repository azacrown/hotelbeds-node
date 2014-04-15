var request = require('request'),
    xml2js = require('xml2js');

var HotelBeds = function() {};

HotelBeds.prototype.API_BASE = 'http://testapi.interface-xml.com/appservices/ws/FrontendService';

HotelBeds.prototype.search = function(params, callback) {
    var builder = new xml2js.Builder({
        rootName: 'soapenv:Envelope',
        xmldec: {}
    });
    var xml = builder.buildObject({
        '$': {
            'soapenv:encodingStyle': 'http://schemas.xmlsoap.org/soap/encoding/',
            'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
        },
        'soapenv:Body': {
            'hb:getHotelValuedAvail': {
                '$': {
                    'xmlns:hb': 'http://axis.frontend.hydra.hotelbeds.com',
                    'xsi:type': 'xsd:string'
                },
                HotelValuedAvailRQ: {
                    '$': {
                        echoToken: params.echoToken,
                        sessionId: params.sessionId,
                        xmlns: 'http://www.hotelbeds.com/schemas/2005/06/messages',
                        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                        version: '2013/04'
                    },
                    Language: params.language,
                    PaginationData: {
                        '$': {
                            pageNumber: params.pageNumber || 1,
                            itemsPerPage: params.itemsPerPage || 100
                        }
                    },
                    Credentials: {
                        User: params.user,
                        Password: params.password
                    },
                    HotelCodeList: (function(hotels) {
                        if (hotels instanceof Array) {
                            var hotel = {
                                '$': {
                                    withinResults: 'Y'
                                },
                                ProductCode: []
                            }
                            for (var i in hotels) {
                                hotel.ProductCode.push(hotels[i]);
                            }
                            return hotel;
                        }
                        return {
                            '$': {
                                withinResults: 'Y'
                            },
                            ProductCode: hotels
                        }
                    })(params.hotelsCodeList),
                    CheckInDate: {
                        '$': { date: params.checkinDate }
                    },
                    CheckOutDate: {
                        '$': { date: params.checkoutDate }
                    },
                    OccupancyList: (function(rooms) {
                        var occupancy = {
                            HotelOccupancy: []
                        };
                        rooms.sort(function(a, b) {
                            return a.split(',')[0] < b.split(',')[0];
                        });
                        occupancy.HotelOccupancy.push({
                            RoomCount: rooms.length,
                            Occupancy: {
                                AdultCount: rooms[0].split(',')[0],
                                ChildCount: rooms[0].split(',')[1] || 0
                            },
                        });
                        return occupancy;
                    })(params.rooms)
                }
            }
        }
    });
    var options = {
        url: this.API_BASE,
        body: xml,
        headers: {
            'Content-Type': 'text/xml',
            "SOAPAction": "http://testapi.interface-xml.com/appservices/ws/FrontendService"
        }
    };
    var me = this;
    request.post(options, function(error, response, body) {
        if(error) {
            callback(xmlError, null);
        } else {
            xml2js.parseString(body, function (err, result) {
                var result = me.parseXmlResp(body, 'getHotelValuedAvail', 'HotelValuedAvail');
                var xmlError = (result.ErrorList) ? me.parseError(result.ErrorList) : false;
                if(xmlError) {
                    callback(xmlError, null);
                    return;
                }
                parseResult(result, callback);
            });
        }
    });
};

var parseResult = function(result, callback) {
    // remove contracts with direct payment
    for(hotel in result['ServiceHotel']) {
        var info = result['ServiceHotel'][hotel];
        if(info['DirectPayment'][0] != 'N') {
            delete result['ServiceHotel'][hotel];
        }
    }    
    callback(null, JSON.stringify(result));
}

HotelBeds.prototype.addService = function(params, callback) {
    var builder = new xml2js.Builder({
        rootName: 'soapenv:Envelope',
        xmldec: {}
    });
    var me = this;
    var xml = builder.buildObject({
        '$': {
            'soapenv:encodingStyle': 'http://schemas.xmlsoap.org/soap/encoding/',
            'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
        },
        'soapenv:Body': {
            'hb:serviceAdd': {
                '$': {
                    'xmlns:hb': 'http://axis.frontend.hydra.hotelbeds.com',
                    'xsi:type': 'xsd:string'
                },
                ServiceAddRQ: {
                    '$': {
                        'xmlns':'http://www.hotelbeds.com/schemas/2005/06/messages',
                        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                        'xsi:schemaLocation': 'http://www.hotelbeds.com/schemas/2005/06/messages ServiceAddRQ.xsd'
                    },
                    'Language': 'ENG',
                    'Credentials': {
                        'User': params.username,
                        'Password': params.password
                    },
                    'Service': {
                        '$': {
                            'xsi:type': 'ServiceHotel',
                            'availToken': params.availToken,
                        },
                        'ContractList': {
                            'Contract': {
                                'Name': params.contractName, 
                                'IncomingOffice': {
                                    '$': {
                                        'code': params.contractIncomingOffice
                                    }
                                }
                            }
                        },
                        'DateFrom': {
                            '$': {
                                date: params.dateFrom,
                            }
                        },
                        'DateTo': {
                            '$' : {
                                date: params.dateTo
                            } 
                        },
                        'HotelInfo': {
                            '$': {
                                'xsi:type':'ProductHotel'
                            },
                            'Code': params.hotelCode,
                            'Destination': {
                                '$': {
                                    'type': params.destinationType,
                                    'code': params.destinationCode
                                }
                            },
                        },
                        'AvailableRoom': {
                            'HotelOccupancy': {
                                'RoomCount': params.roomCount,
                                'Occupancy': {
                                    'AdultCount': params.adultCount,
                                    'ChildCount': 0,
                                    'GuestList': {
                                        'Customer': params.customers
                                    }
                                }
                            },
                            'HotelRoom': {
                                '$': {
                                    'SHRUI': params.SHRUI
                                },
                                'Board': {
                                    '$': {
                                        type: params.boardType,
                                        code: params.boardCode
                                    }
                                },
                                'RoomType': {
                                    '$': {
                                        type:params.roomType,
                                        code: params.roomTypeCode,
                                        characteristic: params.roomCharacteristic
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    var options = {
        url: this.API_BASE,
        body: xml,
        headers: { 
            'Content-Type': 'text/xml',
            "SOAPAction": "http://testapi.interface-xml.com/appservices/ws/FrontendService"
        }
    };
    request.post(options, function(error, response, body) {
        if(error) return callback(error, null);
        var result = me.parseXmlResp(body, 'serviceAdd');
            var xmlError = (result.ErrorList) ? me.parseError(result.ErrorList) : false;
            if(xmlError) {
                callback(xmlError, null);
                return;
            }
            var purchase = result.Purchase;
            var customers = me.parseCustomers(purchase[0].ServiceList[0].
                Service[0].AvailableRoom[0].HotelOccupancy[0].Occupancy[0].
                GuestList[0].Customer);
            callback(null, {
                purchaseToken: purchase[0].$.purchaseToken,
                SPUI: purchase[0].ServiceList[0].Service[0]['$'].SPUI,
                customers:customers
            });
            return;
    });
}

HotelBeds.prototype.parseError = function(ErrorList) {
    var error = ErrorList[0].Error[0];
    parsed = {
        code: error.Code[0],
        timestamp: error.Timestamp[0],
        message: error.Message[0],
        detailedMessage: error.DetailedMessage[0]
    }
    return parsed;
}

HotelBeds.prototype.parseCustomers = function(customers) {
    var processed = [];
    var helper = {}
    for(i in customers) {
        helper = customers[i];
        helper.BirthDate = (helper.BirthDate)? helper.BirthDate[0].$.date:'';
        helper.firstName = helper.Name || '';
        helper.lastName = helper.LastName ||'';
        helper.type = helper.$.type || 'AD';
        delete helper['$'];
        processed.push(helper);
    }
    return processed;
}

HotelBeds.prototype.purchaseConfirm = function(params, callback) {
    var builder = new xml2js.Builder({
        rootName: 'soapenv:Envelope',
        xmldec: {}
    });
    var me = this;
    var xml = builder.buildObject({
        '$': {
            'soapenv:encodingStyle': 'http://schemas.xmlsoap.org/soap/encoding/',
            'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
        },
        'soapenv:Body': {
            'hb:purchaseConfirm': {
                '$': {
                    'xmlns:hb': 'http://axis.frontend.hydra.hotelbeds.com',
                    'xsi:type': 'xsd:string'
                },
                PurchaseConfirmRQ: {
                    '$': {
                        xmlns: 'http://www.hotelbeds.com/schemas/2005/06/messages',
                        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                        version: '2013/04'
                    },
                    Language: 'ENG',
                    Credentials: {
                        User: params.username,
                        Password: params.password
                    },
                    ConfirmationData: {
                        '$': {
                            purchaseToken: params.purchaseToken
                        },
                        Holder: {
                            '$': {
                                type: 'AD'
                            },
                            Name: params.holder.firstName,
                            LastName: params.holder.lastName
                        },
                        AgencyReference: 'test',
                        ConfirmationServiceDataList: {
                            ServiceData: {
                                '$': {
                                    'xsi:type': 'ConfirmationServiceDataHotel',
                                    SPUI: params.SPUI
                                },
                                CustomerList: (function(customers) {
                                    var customer = {
                                        Customer: []
                                    };
                                    for (var i in customers) {
                                        customer.Customer.push({
                                            '$': {
                                                type: 'AD'
                                            },
                                            CustomerId: (parseInt(i) + 1),
                                            Age: 24,
                                            Name: customers[i].firstName,
                                            LastName: customers[i].lastName
                                        });
                                    }
                                    return customer;
                                })(params.customers)
                            }
                        }
                    }
                }
            }
        }
    });
    var options = {
        url: this.API_BASE,
        body: xml,
        headers: {
            'Content-Type': 'text/xml',
            "SOAPAction": "http://testapi.interface-xml.com/appservices/ws/FrontendService"
        }
    };
    request.post(options, function(error, response, body) {
        if(error) return callback(error,null);
        var result = me.parseXmlResp(body, 'purchaseConfirm');
        var xmlError = (result.ErrorList) ? me.parseError(result.ErrorList):false;
        if(xmlError) {
            callback(xmlError);
            return false;
        }
        result.itineraryId = result.Purchase[0].Reference[0].FileNumber[0];
        callback(null, result);
    });
}

HotelBeds.prototype.parseXmlResp = function(body, service, section) {
    var JSONResult = '';
    xml2js.parseString(body, function(err, result) {
        if(err) return JSONResult = err;
        var xmlBody = result['soapenv:Envelope']['soapenv:Body'][0]['ns1:' + service][0]._;
        xml2js.parseString(xmlBody, function(err, parsed) {
            service = service.replace(/[A-z]{1}/, function(it) {
                return it.toUpperCase();
            });
            
            if (section) {
                parsed = parsed[section + 'RS'];
            } else {
                parsed = parsed[service + 'RS'];
            }
            
            delete parsed.$;
            return JSONResult = parsed;

        });
    });
    return JSONResult;
}

module.exports = new HotelBeds();
