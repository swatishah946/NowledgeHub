import React from 'react';
import Layout from '../components/Shared/Layout';
import PageBackground from '../components/Shared/PageBackground';
import AiAssistant from '../components/AI/AiAssistant';

const AiAssistantPage = () => {
    return (
        <Layout>
            <PageBackground>
                <AiAssistant />
            </PageBackground>
        </Layout>
    );
};

export default AiAssistantPage;
