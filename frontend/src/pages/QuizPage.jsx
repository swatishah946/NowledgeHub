import Layout from '../components/Shared/Layout';
import PageBackground from '../components/Shared/PageBackground';
import Quiz from '../components/Quiz/Quiz';

const QuizPage = () => {
    return (
        <Layout>
            <PageBackground>
                <div className="container">
                    <Quiz />
                </div>
            </PageBackground>
        </Layout>
    );
};

export default QuizPage;