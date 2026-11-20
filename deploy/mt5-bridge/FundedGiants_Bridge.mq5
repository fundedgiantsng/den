//+------------------------------------------------------------------+
//|                                        FundedGiants_Bridge.mq5   |
//|                         Copyright 2026, FundedGiants Technologies|
//|                                  https://fundedgiants.com        |
//+------------------------------------------------------------------+
#property copyright   "FundedGiants Technologies"
#property link        "https://fundedgiants.com"
#property version     "1.00"
#property description "High-Speed Real-Time A-Book Socket Execution Bridge for FundedGiants"
#property strict

#include <Trade\Trade.mqh>

//--- Input Parameters
input group "=== Bridge Configuration ==="
input string   InpTargetAccount  = "PR-1M";         // Target Account Tag (e.g. PR-1M, RR-10M)
input string   InpBridgeHost     = "127.0.0.1";     // Local Bridge Daemon Host
input int      InpBridgePort     = 9090;            // Local Bridge Daemon Port
input int      InpSlippagePoints = 30;              // Max Slippage in Points (3 pips)
input int      InpTimerMs        = 5;               // Polling interval in milliseconds (5ms)

//--- Global Variables
CTrade         m_trade;
int            m_socket          = INVALID_HANDLE;
datetime       m_lastReconnect   = 0;
string         m_receiveBuffer   = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   PrintFormat("[FundedGiants Bridge] Initializing for Target: %s on %s:%d", InpTargetAccount, InpBridgeHost, InpBridgePort);
   
   m_trade.SetDeviationInPoints(InpSlippagePoints);
   m_trade.SetTypeFilling(ORDER_FILLING_IOC);
   
   // Connect socket
   ConnectSocket();
   
   // Start ultra-fast 5ms timer
   EventSetMillisecondTimer(InpTimerMs);
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   CloseSocket();
   Print("[FundedGiants Bridge] Bridge stopped.");
}

//+------------------------------------------------------------------+
//| Timer event function (Ultra-fast 5ms cycle)                      |
//+------------------------------------------------------------------+
void OnTimer()
{
   if(m_socket == INVALID_HANDLE)
   {
      datetime now = TimeCurrent();
      if(now - m_lastReconnect >= 5)
      {
         m_lastReconnect = now;
         ConnectSocket();
      }
      return;
   }
   
   // Check if data is available on the socket
   uint readable = SocketIsReadable(m_socket);
   if(readable > 0)
   {
      uchar buffer[];
      ArrayResize(buffer, (int)readable);
      int bytesRead = SocketRead(m_socket, buffer, readable, 10);
      
      if(bytesRead > 0)
      {
         string chunk = CharArrayToString(buffer, 0, bytesRead, CP_UTF8);
         m_receiveBuffer += chunk;
         ProcessBuffer();
      }
      else if(bytesRead < 0)
      {
         PrintFormat("[FundedGiants Bridge] Socket read error: %d. Reconnecting...", GetLastError());
         CloseSocket();
      }
   }
}

//+------------------------------------------------------------------+
//| Connect TCP Socket directly to Local Daemon                      |
//+------------------------------------------------------------------+
void ConnectSocket()
{
   CloseSocket();
   
   m_socket = SocketCreate(SOCKET_DEFAULT);
   if(m_socket == INVALID_HANDLE)
   {
      PrintFormat("[FundedGiants Bridge] Failed to create socket: %d", GetLastError());
      return;
   }
   
   if(!SocketConnect(m_socket, InpBridgeHost, InpBridgePort, 1000))
   {
      PrintFormat("[FundedGiants Bridge] Connection to %s:%d failed: %d", InpBridgeHost, InpBridgePort, GetLastError());
      CloseSocket();
      return;
   }
   
   PrintFormat("[FundedGiants Bridge] ⚡ Connected successfully to daemon at %s:%d", InpBridgeHost, InpBridgePort);
   
   // Send registration handshake
   string handshake = StringFormat("{\"type\":\"REGISTER\",\"targetAccount\":\"%s\"}\n", InpTargetAccount);
   SendResponse(handshake);
}

//+------------------------------------------------------------------+
//| Close TCP Socket cleanly                                         |
//+------------------------------------------------------------------+
void CloseSocket()
{
   if(m_socket != INVALID_HANDLE)
   {
      SocketClose(m_socket);
      m_socket = INVALID_HANDLE;
   }
}

//+------------------------------------------------------------------+
//| Process incoming line-delimited JSON commands                    |
//+------------------------------------------------------------------+
void ProcessBuffer()
{
   int newlineIndex = StringFind(m_receiveBuffer, "\n");
   while(newlineIndex >= 0)
   {
      string line = StringSubstr(m_receiveBuffer, 0, newlineIndex);
      m_receiveBuffer = StringSubstr(m_receiveBuffer, newlineIndex + 1);
      
      StringTrimLeft(line);
      StringTrimRight(line);
      
      if(StringLen(line) > 0)
      {
         ExecuteCommand(line);
      }
      newlineIndex = StringFind(m_receiveBuffer, "\n");
   }
}

//+------------------------------------------------------------------+
//| Fast JSON Token Extractor Helper                                 |
//+------------------------------------------------------------------+
string JsonGetString(const string json, const string key)
{
   string search = "\"" + key + "\":\"";
   int start = StringFind(json, search);
   if(start < 0) return "";
   start += StringLen(search);
   int end = StringFind(json, "\"", start);
   if(end < 0) return "";
   return StringSubstr(json, start, end - start);
}

double JsonGetNumber(const string json, const string key)
{
   string search = "\"" + key + "\":";
   int start = StringFind(json, search);
   if(start < 0) return 0.0;
   start += StringLen(search);
   int end = StringFind(json, ",", start);
   if(end < 0) end = StringFind(json, "}", start);
   if(end < 0) return 0.0;
   return StringToDouble(StringSubstr(json, start, end - start));
}

//+------------------------------------------------------------------+
//| Execute Parsed Trade Command                                     |
//+------------------------------------------------------------------+
void ExecuteCommand(const string json)
{
   string target = JsonGetString(json, "targetAccount");
   if(target != InpTargetAccount && target != "ALL")
   {
      return; // Not meant for this terminal
   }
   
   string action        = JsonGetString(json, "action");
   string steraTradeId  = JsonGetString(json, "steraTradeId");
   string symbol        = JsonGetString(json, "symbol");
   string direction     = JsonGetString(json, "direction");
   string comment       = JsonGetString(json, "comment");
   double volume        = JsonGetNumber(json, "volume");
   ulong  magicNumber   = (ulong)JsonGetNumber(json, "magicNumber");
   double sl            = JsonGetNumber(json, "stopLoss");
   double tp            = JsonGetNumber(json, "takeProfit");
   
   // Normalize symbol if needed
   if(!SymbolSelect(symbol, true))
   {
      PrintFormat("[FundedGiants Bridge] Warning: Symbol %s not found in Market Watch", symbol);
   }
   
   m_trade.SetExpertMagicNumber(magicNumber);
   
   // 1. OPEN TRADE
   if(action == "OPEN")
   {
      PrintFormat("[FundedGiants Bridge] ⚡ Executing OPEN %s %s %.2f lots | Magic: %d", direction, symbol, volume, magicNumber);
      
      bool success = false;
      if(direction == "BUY")
      {
         double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
         success = m_trade.Buy(volume, symbol, ask, sl, tp, comment);
      }
      else if(direction == "SELL")
      {
         double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
         success = m_trade.Sell(volume, symbol, bid, sl, tp, comment);
      }
      
      ulong ticket = m_trade.ResultOrder();
      if(!success || ticket == 0)
      {
         ticket = m_trade.ResultDeal();
      }
      
      string ack = StringFormat("{\"type\":\"ACK\",\"steraTradeId\":\"%s\",\"brokerTicketId\":%d,\"success\":%s,\"retcode\":%d}\n",
                                steraTradeId, ticket, success ? "true" : "false", m_trade.ResultRetcode());
      SendResponse(ack);
   }
   // 2. CLOSE TRADE
   else if(action == "CLOSE")
   {
      PrintFormat("[FundedGiants Bridge] ⚡ Executing CLOSE for Ticket/Magic: %s / %d", steraTradeId, magicNumber);
      
      // Close all positions matching this magicNumber
      int total = PositionsTotal();
      for(int i = total - 1; i >= 0; i--)
      {
         ulong posTicket = PositionGetTicket(i);
         if(posTicket > 0)
         {
            if(PositionGetInteger(POSITION_MAGIC) == (long)magicNumber)
            {
               m_trade.PositionClose(posTicket, InpSlippagePoints);
               PrintFormat("[FundedGiants Bridge] Closed position #%d for magic %d", posTicket, magicNumber);
            }
         }
      }
      
      string ack = StringFormat("{\"type\":\"ACK_CLOSE\",\"steraTradeId\":\"%s\",\"success\":true}\n", steraTradeId);
      SendResponse(ack);
   }
   // 3. MODIFY SL/TP
   else if(action == "MODIFY")
   {
      int total = PositionsTotal();
      for(int i = total - 1; i >= 0; i--)
      {
         ulong posTicket = PositionGetTicket(i);
         if(posTicket > 0 && PositionGetInteger(POSITION_MAGIC) == (long)magicNumber)
         {
            m_trade.PositionModify(posTicket, sl, tp);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Send Socket Acknowledgment to Daemon                             |
//+------------------------------------------------------------------+
void SendResponse(const string message)
{
   if(m_socket == INVALID_HANDLE) return;
   
   uchar data[];
   StringToCharArray(message, data, 0, StringLen(message), CP_UTF8);
   SocketSend(m_socket, data, ArraySize(data));
}
//+------------------------------------------------------------------+
