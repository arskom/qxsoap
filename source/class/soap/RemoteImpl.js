
/*
 * Copyright (c) Burak Arslan (burak.arslan-qx@arskom.com.tr).
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the Arskom Consultancy Ltd. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
 * OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

qx.Class.define("soap.RemoteImpl", { extend : qx.ui.table.model.Remote
    ,include : [qx.locale.MTranslation]

    ,construct : function(soap_client, row_count_method_name,
                  row_data_method_name, args, mapper) {
        this.base(arguments);

        this.__soap_client = soap_client;
        this.__count_method_name = row_count_method_name;
        this.__data_method_name = row_data_method_name;
        this.__args = args;

        if (mapper) {
            this.setMapper(mapper);
        }
    }

    ,properties : {
        mapper: { check: "Function", init: null, nullable: true }
    }

    ,events : {
         "dataLoaded": "qx.event.type.Data"
    }

    ,members : {
         __soap_client: null
        ,__row_count_method_name: null
        ,__row_data_method_name: null
        ,__count_request_sent: false
        ,__args: null

        ,_loadRowCount : function() {
            var ctx = this;
            var svc = ctx.__soap_client;
            var args = ctx.__args;

            if (ctx.__count_request_sent) {
                return;
            }
            else {
                ctx.__count_request_sent = true;
            }

            svc.callAsync(this.__count_method_name, args,
                true, function(r) {
                    ctx.__count_request_sent = false;
                    ctx._onRowCountLoaded(r);
                });
        }

        ,_loadRowData : function(first_row, last_row) {
            var ctx = this;
            var svc = ctx.__soap_client;
            var args = ctx.__args;

            // construct request object
            var header = args.get_soap_req_header()
            if (! header) {
                var h_class = this.__soap_client.get_header_class();
                header = new h_class();
            }

            if (this.getSortColumnIndex() >= 0) {
                header.set_sort_key(this.getColumnId(this.getSortColumnIndex()));
                header.set_sort_ord(this.isSortAscending() ? "d" : "a");
            }

            header.set_row(first_row);
            args.set_soap_req_header(header);

            // issue soap call
            svc.callAsync(this.__data_method_name, args,
                true, function(r) {
                    if (r) {
                        if (ctx.getMapper() != null) {
                            ctx.getMapper()(r);
                        }

                        ctx._onRowDataLoaded(r);
                    }
                    else {
                        qx.log.Logger.debug("Row data is empty! r is null!");
                    }
                    ctx.fireDataEvent("dataLoaded",r);
                });
        }

        // overridden
        ,getValue : function(columnIndex, rowIndex) {
            var rowData = this.getRowData(rowIndex);
            var retval=null;

            if (rowData != null) {
                var columnId = this.getColumnId(columnIndex);
                if (columnId.constructor == Array) {
                    retval = rowData[columnId[0]];
                    for (var i=1; i< columnId.length; ++i) {
                        retval = retval[columnId[i]];
                    }
                }
                else {
                    retval = rowData[columnId];
                }
            }

            return retval;
        }
    }
});
