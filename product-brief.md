
  - What core problem are you trying to solve?

    I want to explore, learn, and implement RAG concepts
    - modular RAG where I can switch components of the RAG pipeline
    - agentic RAG where the RAG pipeline can decide what to do next and what not to do
    - adaptive RAG where the RAG pipeline adapts to the depth of the query
    - corrective RAG where the RAG pipeline checks answers and corrects them automatically
    - HyDE where the RAG pipeline compensates for vague queries
    - self-rag where the RAG pipeline rewrites questions to get better results

    I want to be able to select types of RAG techniques before doing retrievals
    I also want to be able to compare outputs per rag retrieval type, side by side comparisons, to determine what type of RAG retrieval is better

    To showcase these concepts, I want to start a simple project called wikirag, where the documents to retrieve comes from the wikipedia dump
    
    All information from wikipedia embedded into a vector database, I also want to explore different kinds of embedding techniques


  - Who experiences this problem most acutely?

    None, this is a concept exploration project

  - What would success look like for the people you're helping?

    the people using it should be able to select a RAG technique, input a query, hit send, queries are usually in the form of a question asking about anything under the sun that wikipedia can answer, output should reflect the type of RAG technique the user selected before sending the query, example self-rag, or corrective-rag

    the user should be able to determine what types of RAG pipelines are suited best to certain queries

  - What excites you most about this solution?

    to be able to create a proof of concept showcasing RAG capabilities


  - How do you currently explore or experiment with RAG techniques today? Are you working from
  papers, tutorials, or existing frameworks like LangChain/LlamaIndex?

    mostly tutorials and langchain.js, specifically typescript

    it is better to use established frameworks for this one and do not create them from scratch

  - What's frustrating about learning RAG concepts with existing tools or resources? Is it the
  lack of hands-on comparison, the black-box nature of frameworks, or something else?

    lack of hands-on comparison, the way they are categorized on what to use on specific problems seems fake, seems they can be used for all kinds of problemsm when they are not, for example corrective-rag sounds like a general way of implementing RAG when there are other types of RAG suited

    I want to see it on a working concept how a RAG implementation behaves

  - When you say "modular RAG where I can switch components" - are you thinking of a
  plugin-style architecture where each RAG technique is a self-contained module, or more of a
  pipeline configuration approach?


    yes plugin style, using adapter layers, with the main steps in the pipeline namely
        - query
        - pre-retrieval
        - retrieval
        - post-retrieval
        - generation
    along with the supporting modules
        - indexing
        - query constructin
        - retriever fine-tuning

    we can interchange implementation per module and per steps in the RAG sequence


    
  - For the Wikipedia dump - are you thinking full English Wikipedia (~22GB compressed), or a
  subset to keep things manageable for exploration?

    yes lets start with full english version


  - What existing RAG comparison or benchmarking tools have you come across, if any? Things
  like RAGAS, or any playground-style tools?

    none, not familiar with any RAG benchmarking tool


  - You mentioned LangChain.js / TypeScript - is that a firm technology choice for the entire
  stack, or are you open to Python for certain components (e.g., embedding pipelines, vector DB
   ingestion)?

    I want to use an all typescript implementation, there is a typescript framework called Mastra typescript agent framework

    if there are implementations that Mastra will not be able to support, we will use typescript langchain to fill the gaps

  - For the vector database, do you have a preference or have you been exploring options?
  (Pinecone, Weaviate, Qdrant, Chroma, pgvector, etc.)

    I specifically want to use qdrant using its typescript driver

  - On embedding techniques you want to explore - are you thinking about comparing different
  embedding models (e.g., OpenAI ada vs. open-source models like BGE/E5), different chunking
  strategies, or both?

    I want to use openai, I also want to know if there are any open source alternatives for vector embedding


  - If we could build the perfect version of WikiRAG, what would the user experience look like?
   Are you envisioning a web UI where you select a RAG technique from a dropdown, type a
  question, and see results? Or more of a CLI/API-first tool?

    I am envisioning a separate API layer application, with a web UI that can be installed through browser, like youtube music where you click the `install` button at the left side of the search bar

  - For the side-by-side comparison feature - are you thinking you'd run the same query through
   multiple RAG techniques simultaneously and see all results at once, or more of a sequential
  "run with technique A, then run with technique B" approach?

    lets do the side-by-side comparison, run them simultaneously, and see results at once

    lets also enable, singular queries for straightforward usage

  - What's the simplest version of WikiRAG that would already be valuable to you? For example,
  would having just two RAG techniques (say, naive RAG vs. corrective RAG) with comparison
  already prove the concept?

    I want to have the following RAG types available
        - naive rag
        - simple rag
        - corrective rag
        - HyDE
        - self rag
        - adaptive rag
        - speculative rag
        - advance rag
        - branched rag

    we will implement them sequentially through the epics

  - How do you see the indexing/ingestion of the Wikipedia dump fitting in - is that a one-time
   setup step, or do you want to experiment with re-indexing using different chunking/embedding
   strategies as part of the exploration?

    I want to have a couple of ways to index the wikipedia dump, but they should be embedded uniformly, if I embed it using chunkin then the entire dump will be emebded using chunking

    lets expose a command that I can call to index the entire dump with specific techniques
    
    if I want to use a different way of embedding, I will delete all the data in the vector database and select a different embedding mechahism and embed the dump again then save it into the vector database

    I have a couple of embedding techniques that I want to implement that is selectable through a CLI command

        - chunking using the optimal chunk sizes
        - per paragraph embedding, per paragraph embed with metadata tags for what article information is it a part of
        - pero document embedding, 1 wikipedia entry into 1 big embedded entry, then add metadata tags for article information\



  - What makes WikiRAG different from just "another RAG tutorial project" in your mind? Is it the breadth of techniques in one place, the comparison capability the real-world scale of using full Wikipedia, or the combination of all three?

    the combination of all three, I done care if it is not unique, I just want to learn the concepts and how it is applied, in this case searching through the wikipedia data

  - The plugin-style adapter architecture you described - do you see this as something that could eventually let others contribute new RAG technique modules, or is this primarily for your own learning?

    both, I want it to be extensible, expandable and also a source of learning


  - Why Wikipedia specifically as the knowledge base? Is it the universality of topics (meaning you can test any kind of query), the scale challenge, or something else?

    all of the above, because it contains broad and deep enough knowledge

  - Is there anything about timing that matters - are you building this alongside learning, or do you already have a strong grasp of all 9 RAG techniques and this is about implementation?

    I am building this alongside learning


  For the evaluator persona:
  - Are these people working on their own RAG projects and using WikiRAG to inform their technique choices? Or more academic/research-oriented?

    both, it will be helpful to whoever is trying to explore the world of RAG be it a junior developer or a seasoned researcher who is now knowledgable to the world of RAGs

  - What would they care about most in the comparison output - accuracy of answers, response time, relevance of retrieved context, or something else?

    accuracy, relevance and structure of responses

    I want to add this in the future, not part of MVP but take note of this, I want to have the option of connection responses to potential topics to look further into and this starts a chain of queries down the rabbit hole
    
    response times can be optimize in the succeeding non functional tasks

  For the learner persona:
  - Would they be someone already familiar with LLMs/AI but new to RAG specifically, or completely new to the AI space?

    both, someone can be familiar and not familiar, they should be able to learn something with the application

  For the contributor persona:
  - What skill level are you imagining - someone who understands the adapter architecture and can implement a new RAG module, or someone more junior following a guide?

    someone who understands the adapter architecture and can implement a new RAG module

    a junior will need to learn a couple of concepts before they can contribute


    - For someone arriving at WikiRAG for the first time (learner or evaluator), what should their first experience be? Should they be able to run a query immediately, or is there setup involved (like choosing an embedding strategy and indexing first)?

      there should be default values set for the configurations, and they can run queries directly with the defaults

      if they want to use other rag techniques, they should be able to select a RAG technique through a dropdown 

  - For the comparison flow - do you see users selecting specific techniques from a checklist before running a query, or more of a "compare all available" default?

      the comparison flow will be a separate tab, they will click comparison mode somewhere the UI and then a technique is preselected from theh dropdown, if they want to change the RAG modes, they will select a different technique through the dropdowns, two of them, then hit run

  - What's the "aha!" moment for each user type? For example, for an evaluator it might be seeing how corrective RAG fixes an answer that naive RAG got wrong.

    they should see improvements on the responses or differences in how the response is shown

    another nice to have, can be added in the succeeding epics, is to show the RAG sequence being executed as a status in the UI



- How will you know WikiRAG is succeeding for its users? For example, is it about whether users can clearly distinguish between RAG technique outputs, or about the platform running reliably at Wikipedia scale?

  both, it is also critical that it works and works reasonably fast, how can we compare responses if the queries doesn't work in the first place?


- What would make you personally say "this project was worth it"? Is it having all 9 RAG techniques working, or is it more about understanding the concepts deeply enough to apply them elsewhere?

  both, first it should be working all of it, second it is also about understanding the concepts deeply enough to apply them elsewhere 


- What metrics show the platform is creating real value - things like response accuracy, retrieval relevance, successful comparisons completed, or something else?

  accuracy and relevance are both important aspects

  lets add these also
    - context relevance
    - context recall
    - groundedness/faithfulness
    - answer relevance
    - answer correctness

  lets use these methods for benchmarking

    - LLM-as-a-judge
    - Golden dataset evaluation
    - Human evaluation
    - Tools like RAGAS, LangChain/LangSmith, TruLens


- Since this is also meant to be extensible for contributors, does success include things like "a new RAG module can be added by following the adapter pattern without modifying core code"?

  yes, we should be able to add more RAG modules by following the adapter pattern, and the system should be able to use depending on the required steps in the RAG pipeline


Business Objectives (adapted for a learning/open-source project):
- Since this isn't a commercial product, how do you think about "business" success? Is it GitHub stars/forks, personal portfolio value, community adoption, or simply project completion?

  I dont care much about stars and forks, only project completion and personal portfolio value

- Do you have any goals around community engagement - like getting external contributors to add RAG modules?

  no, if this is something interesting to other people, then this should be organic

KPI Specifics:
- For the quality metrics (context relevance, recall, groundedness, etc.) - do you want these scores displayed per query in the UI, or more as a batch evaluation you run periodically against a golden dataset?

  display these scores per query, this can be done through a fast scoring system

  I also want to run evaluations, this can be done outside the app, through a CLI perhaps if this is expensive to run

- For "works reasonably fast" - do you have a rough threshold in mind for acceptable response time per query? Something like under 5 seconds, under 10 seconds?

  lets be generous, up to 60 seconds, we will test this in local, with all supporting services running docker


- lets start with the suggestions
- start with the per-paragraph with metadata
- support comparing 2 comparisons at a time, add support of multi comparisons to deffered features


MVP Success Criteria
- yes
- factual questions, open-ended questions, vague questions, and add meta-questions

Future Vision
- integration with other vector databases is definitely added on the next version
- images/audi/video support in the future



  1. The "aha!" moment - you mentioned users should "see improvements or differences inresponses." What would make you personally say "yes, this comparison is working" - is it seeing corrective RAG fix something naive RAG got wrong, or more about the quality scores being visibly different?

  both, I want technical differences with proper benchmarked numbers, and I also want experiential differences that can be seen and felt by the user

  2. MVP validation - you listed 4 query types (factual, open-ended, vague, meta). Do you have a rough sense of how many test queries you'd want to run to feel confident the MVP is working, or is it more of a "I'll know it when I see it" thing?

    lets start with 50 test queries per type


1. For the Learner - do you imagine them arriving at a hosted/pre-indexed instance, or would they always need to set up locally? Is the "zero setup" querying experience assuming data is already indexed?

  as a learner/developer I have the option to run the application locally

  when I start the application locally, backend API layer in a docker image and frontend PWA in another docker image, it should be ready to use

  indexing the wikipedia dump is an expensive process, I should be able to do this separately through a CLI command

  the indexing process will go through the following process
    - read and parse the wikipedia dump
    - create embeddings
    - save them into qdrant, with article metadata
  the indexing process will be done in streams, and we can restart the index where we left off if stopped or paused

2. For the Operator persona - is this always the same person as the Builder (you, setting things up for yourself), or could it be someone deploying WikiRAG for a team/class to use?

  anyone should be able to setup the application and the setup will be seggregated into layers
    - data layer (wikipedia reading, parsing, embedding and inserting into qdrant)
    - API layer, run a docker container to start the API backend layer
    - PWA layer, run a docker container to start the PWA frontend layer



1. SPA or MPA? - Given it's a PWA with two main modes (single query + comparison), this is almost certainly an SPA. Can you confirm?

  SPA using ReactJS

2. Browser support? - Since this is a learning/portfolio project, do you want to support all major browsers (Chrome, Firefox, Safari, Edge), or is Chrome-only fine for MVP?

  I want to support Chrome, Chromium, Firefox, Brave

3. SEO needed? - This is a locally-deployed tool, not a public website. I'm assuming SEO is irrelevant here. Correct?

  this is not required

4. Real-time? - The query responses could take up to 60s. Are you thinking of streaming the response as it generates (like ChatGPT does), or just a loading state until the full response is ready?

  yes, I want to apply streaming of responses

5. Accessibility? - Any WCAG compliance targets, or basic accessibility (keyboard nav, screen reader basics) is sufficient?

  basic accessibility is sufficient
