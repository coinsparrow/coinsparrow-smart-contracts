import
{
  increaseTimeTo,
  duration,
}
  from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const BigNumber = web3.BigNumber;

const Hashids = require('hashids');
const hashids = new Hashids('some salting', 16);

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const CoinSparrow = artifacts.require('CoinSparrow');

const STATUS_JOB_NOT_EXIST = 1; // Not used in contract. Here for reference (used externally)
const STATUS_JOB_CREATED = 2; // Job has been created. Set by createJobEscrow()
const STATUS_JOB_STARTED = 3; // Contractor flags job as started. Set by jobStarted()
const STATUS_HIRER_REQUEST_CANCEL = 4; // Hirer requested cancellation on started job.

const STATUS_JOB_COMPLETED = 5; // Contractor flags job as completed. Set by jobCompleted()
const STATUS_JOB_IN_DISPUTE = 6; // Either party raised dispute. Set by requestDispute()
// const STATUS_HIRER_CANCELLED = 7; // Not used in contract. Here for reference
// const STATUS_CONTRACTOR_CANCELLED = 8; // Not used in contract. Here for reference
// const STATUS_FINISHED_FUNDS_RELEASED = 9; // Not used in contract. Here for reference
// const STATUS_FINISHED_FUNDS_RELEASED_BY_CONTRACTOR = 10; // Not used in contract. Here for reference
const STATUS_CONTRACTOR_REQUEST_CANCEL = 11; // Contractor requested cancellation on started job.

// const STATUS_MUTUAL_CANCELLATION_PROCESSED = 12; // Not used in contract. Here for reference

contract('CoinSparrow', function ([_owner, _hirer, _contractor,
  _newArbitrator, _withdrawAccount, _,
]) {
  let jobNum = 1000000000;
  let _jobId = hashids.encode(jobNum);
  const _value = new web3.BigNumber(web3.toWei(0.2, 'ether'));
  const _fee = _value.mul(0.01);
  const _jobStartWindow = 600;
  const MAX_SEND = 3;

  beforeEach(async function () {
    this.startTime = latestTime();
    this.agreedSecondsToComplete = duration.days(1);
    this.coinSparrow = await CoinSparrow.new(new web3.BigNumber(
      web3.toWei(MAX_SEND, 'ether')),
    {
      from: _owner,
    });
    jobNum++;
    //    _jobId = web3.fromAscii(hashids.encode(jobNum));
    _jobId = hashids.encode(jobNum);
    // console.log(_jobId);
  });

  /*
   * Job Statuses
   */
  describe('Job Statuses', function () {
    it('Job should not exist before being created (!)', async function () {
      var res = await this.coinSparrow.getJobStatus.call(
        _jobId, _hirer, _contractor, _value, _fee);
      res.toNumber()
        .should.be.equal(STATUS_JOB_NOT_EXIST); ;
    });

    it('Status should = STATUS_JOB_CREATED after created',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_JOB_CREATED);
      });

    it('Status should = STATUS_JOB_STARTED after started',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_JOB_STARTED);
      });

    it('Status should = STATUS_JOB_COMPLETED after completed',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_JOB_COMPLETED);
      });

    it(
      'Status should = STATUS_HIRER_REQUEST_CANCEL after hirer calls requestMutualCancelation',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_HIRER_REQUEST_CANCEL);
      });

    it(
      'Status should = STATUS_CONTRACTOR_REQUEST_CANCEL after hirer calls requestMutualCancelation',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_CONTRACTOR_REQUEST_CANCEL);
      });

    it(
      'Status should = STATUS_JOB_IN_DISPUTE after hirer calls requestDispute',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_JOB_IN_DISPUTE);
      });

    it(
      'Status should = STATUS_JOB_IN_DISPUTE after contractor calls requestDispute',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestDispute(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_JOB_IN_DISPUTE);
      });

    it(
      'Status should = STATUS_JOB_NOT_EXIST after Hirer funds released (i.e. deleted from blockchain)',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await this.coinSparrow.hirerReleaseFunds(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_JOB_NOT_EXIST);
      });

    it(
      'Status should = STATUS_JOB_NOT_EXIST after Contractor funds released (i.e. deleted from blockchain)',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
        await increaseTimeTo(latestTime() + duration.weeks(
          4) + duration.seconds(1));
        await this.coinSparrow.contractorReleaseFunds(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_JOB_NOT_EXIST);
      });

    it(
      'Status should = STATUS_JOB_NOT_EXIST after Hirer cancels (i.e. deleted from blockchain)',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await increaseTimeTo(latestTime() + _jobStartWindow +
          1);

        await this.coinSparrow.hirerCancel(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_JOB_NOT_EXIST);
      });

    it(
      'Status should = STATUS_JOB_NOT_EXIST after Contractor cancels (i.e. deleted from blockchain)',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.contractorCancel(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        var res = await this.coinSparrow.getJobStatus.call(
          _jobId, _hirer, _contractor, _value, _fee);
        res.toNumber()
          .should.be.equal(STATUS_JOB_NOT_EXIST);
      });

    /*
     * TODO: STATUS_JOB_IN_DISPUTE
     */
  });
});
