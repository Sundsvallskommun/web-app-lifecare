import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ContractorController, NewContractorDTO } from '@/controllers/contractor.controller';

describe('decorator metadata', () => {
  it('records the body type of a controller action', () => {
    const types = Reflect.getMetadata('design:paramtypes', ContractorController.prototype, 'newOrgUser');

    expect(types).toContain(NewContractorDTO);
  });
});
