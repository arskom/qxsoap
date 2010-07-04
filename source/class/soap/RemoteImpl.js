
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

    ,construct : function(service_instance, row_count_method_name,
                  row_data_method_name, service_arguments, session_id, mapper) {
                      
        this.base(arguments);
        this.setRowCountMethodName(row_count_method_name);
        this.setRowDataMethodName(row_data_method_name);
        this.setServiceInstance(service_instance);
        this.setServiceArguments(service_arguments);

        if (session_id + "" != "undefined") {
            this.setSessionId(session_id)
        }
        else {
            this.setSessionId("");
        }
        if (mapper + "" != "undefined") {
            this.setMapper(mapper);
        }
        else {
            this.setMapper(null);
        }
    }

    ,properties : {
         mapper: { check: "Function", init: null, nullable: true }
        ,sessionId: { check: "String", init: null }
        ,serviceInstance: { check: "soap.Client", nullable: false }
        ,serviceArguments: { check: "soap.Parameters", nullable: false }
        ,rowDataMethodName: { check: "String", nullable: false}
        ,rowCountMethodName: { check: "String", nullable: false}
    }

    ,events : {
         "dataLoaded": "qx.event.type.Data"
    }

    ,members : {
         __count_request_sent : false

        ,_loadRowCount : function() {
            var ctx = this;
            var svc = ctx.getServiceInstance();

            if (ctx.__count_request_sent) {
                return;
            }
            else {
                ctx.__count_request_sent = true;
            }

            var params = this.getServiceArguments();

            ctx.SoapRunning = svc.callAsync(this.getRowCountMethodName(), params,
                true, function(r) {
                    ctx.SoapRunning = null;
                    ctx.__count_request_sent = false;
                    ctx._onRowCountLoaded(r);
                });
        }

        ,_loadRowData : function(firstRow, lastRow) {
            var ctx=this;
            var svc = ctx.getServiceInstance();
            var params = ctx.getServiceArguments();

            // construct request object
            var request = svc.get_object("HelloWorldService.HelloWorldService", "SOAPRequest");

            var sort_column_index = this.getSortColumnIndex() != -1 ?
                                                  this.getSortColumnIndex() : 0;

            var sort_order = this.isSortAscending() ? "d" : "a";

            request.set_who(this.getSessionId());
            request.set_sort_by(sort_column_index);
            request.set_sort_ord(sort_order);
            request.set_startrow(firstRow);
            params.add("req",request);

            // issue soap call
            ctx.SoapRunning = svc.callAsync( this.getRowDataMethodName(), params,
                true, function(r) {
                    r._start_row = firstRow;
                    ctx.SoapRunning = null;
                    if (ctx.getMapper() != null) {
                        ctx.getMapper()(r);
                    }
                    ctx._onRowDataLoaded(r);
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
