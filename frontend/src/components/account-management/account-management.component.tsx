'use client';

import { Table } from '@components/table/table.component';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import { useUserStore } from '@services/user-service/user-service';
import React, { useEffect } from 'react';
import useContractorStore from 'src/store/useContractorStore.store';
import { shallow } from 'zustand/shallow';

export const AccountManagement: React.FC = () => {
  const user = useUserStore((s) => s.user, shallow);
  const contractorData = useContractorStore((s) => s.contractorData);
  const fetchContractorData = useContractorStore((s) => s.fetchContractorData);

  useEffect(() => {
    if (user?.username) {
      fetchContractorData();
    }
  }, [fetchContractorData, user]);

  return (
    <DefaultLayout>
      <Table contractorData={contractorData} />
    </DefaultLayout>
  );
};

export default AccountManagement;
