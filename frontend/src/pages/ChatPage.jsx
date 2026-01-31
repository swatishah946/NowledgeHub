import React from 'react';
import Layout from '../components/Shared/Layout';
import PageBackground from '../components/Shared/PageBackground';
import ChatRoom from '../components/Chat/ChatRoom';

const ChatPage = () => {
    return (
        <Layout>

            <PageBackground>
                <div className="container">
                    <ChatRoom />
                </div>
            </PageBackground>
        </Layout>
    );
};

export default ChatPage;
