import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { createLoanServer } from './server';

export type ProtocolLog = (direction: 'client → server' | 'server → client', message: unknown) => void;

// Transport'un send metodunu sarmalayıp giden her JSON-RPC mesajını kaydeder
function tap(transport: Transport, direction: Parameters<ProtocolLog>[0], log: ProtocolLog) {
  const originalSend = transport.send.bind(transport);
  transport.send = async (message, options) => {
    log(direction, message);
    return originalSend(message, options);
  };
}

export async function connectInMemory(log: ProtocolLog) {
  const server = createLoanServer();
  const client = new Client({ name: 'demo-host', version: '0.1.0' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  tap(clientTransport, 'client → server', log);
  tap(serverTransport, 'server → client', log);

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}