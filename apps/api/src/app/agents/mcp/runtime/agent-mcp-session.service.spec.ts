import { McpConnectionScopeEnum, McpConnectionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { AgentMcpSessionService } from './agent-mcp-session.service';

const ENV_ID = 'env_1';
const ORG_ID = 'org_1';
const AGENT_ID = 'agent_1';
const SUBSCRIBER_MONGO_ID = 'sub_1';

function makeService(stubs: { enablements: unknown[]; connections?: unknown[] }): {
  service: AgentMcpSessionService;
  agentMcpServerRepository: { findByAgent: sinon.SinonStub };
  mcpConnectionRepository: { findSubscriberConnectionsForAgent: sinon.SinonStub };
} {
  const logger = {
    setContext: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };
  const mcpConnectionRepository = {
    findSubscriberConnectionsForAgent: sinon.stub().resolves(stubs.connections ?? []),
  };
  const agentMcpServerRepository = {
    findByAgent: sinon.stub().resolves(stubs.enablements),
  };
  const service = new AgentMcpSessionService(
    mcpConnectionRepository as never,
    agentMcpServerRepository as never,
    logger as never
  );

  return { service, agentMcpServerRepository, mcpConnectionRepository };
}

function enablementRow(mcpId: string, rowId: string): unknown {
  return {
    _id: rowId,
    mcpId,
    enabled: true,
    defaultScope: McpConnectionScopeEnum.Subscriber,
  };
}

describe('AgentMcpSessionService keyless per-send attach', () => {
  it('needs no per-send override when only the keyless MCP is enabled', async () => {
    // parallel-search rides the shared agent definition (see
    // AgentMcpDefinitionService), so with no OAuth MCPs enabled the runtime
    // needs no per-send list.
    const { service } = makeService({ enablements: [enablementRow('parallel-search', 'ams_parallel')] });

    const result = await service.resolveConnectedMcps({
      agentId: AGENT_ID,
      environmentId: ENV_ID,
      organizationId: ORG_ID,
      subscriberMongoId: SUBSCRIBER_MONGO_ID,
    });

    expect(result).to.equal(undefined);
  });

  it('still gates OAuth MCPs on connected rows while attaching keyless ones', async () => {
    const { service } = makeService({
      enablements: [enablementRow('parallel-search', 'ams_parallel'), enablementRow('linear', 'ams_linear')],
      connections: [{ _agentMcpServerId: 'ams_linear', mcpId: 'linear', status: McpConnectionStatusEnum.Connected }],
    });

    const result = await service.resolveConnectedMcps({
      agentId: AGENT_ID,
      environmentId: ENV_ID,
      organizationId: ORG_ID,
      subscriberMongoId: SUBSCRIBER_MONGO_ID,
    });

    expect((result ?? []).map((entry) => entry.name)).to.deep.equal(['Parallel Search', 'Linear']);
  });

  it('returns an empty per-send list when only unconnected OAuth MCPs are enabled', async () => {
    const { service } = makeService({ enablements: [enablementRow('linear', 'ams_linear')] });

    const result = await service.resolveConnectedMcps({
      agentId: AGENT_ID,
      environmentId: ENV_ID,
      organizationId: ORG_ID,
      subscriberMongoId: SUBSCRIBER_MONGO_ID,
    });

    expect(result).to.deep.equal([]);
  });
});
